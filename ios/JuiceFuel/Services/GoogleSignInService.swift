import Foundation
import AuthenticationServices
import UIKit

/// Drives the Google sign-in flow via ASWebAuthenticationSession.
///
/// We don't pull in GoogleSignIn-iOS — instead we ride the existing
/// /api/auth/google web flow with a `?return_to=ios` flag, and the server
/// redirects back to `juicefuel://auth/callback?token=...` once it has a
/// session. ASWebAuthenticationSession captures the URL-scheme redirect
/// and hands it back to us.
@MainActor
final class GoogleSignInService: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = GoogleSignInService()

    private let baseURL = APIClient.shared.baseURL
    private let callbackScheme = "juicefuel"

    enum SignInError: Error, LocalizedError {
        case cancelled
        case noToken
        case server(String)
        case underlying(Error)

        var errorDescription: String? {
            switch self {
            case .cancelled: return nil
            case .noToken: return "Google did not return a session token"
            case .server(let msg): return "Google sign-in failed: \(msg)"
            case .underlying(let err): return err.localizedDescription
            }
        }
    }

    func signIn() async throws -> String {
        guard let startURL = URL(string: "/api/auth/google?return_to=ios", relativeTo: baseURL) else {
            throw SignInError.server("invalid start URL")
        }

        return try await withCheckedThrowingContinuation { continuation in
            let session = ASWebAuthenticationSession(
                url: startURL,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin {
                    continuation.resume(throwing: SignInError.cancelled)
                    return
                }
                if let error {
                    continuation.resume(throwing: SignInError.underlying(error))
                    return
                }
                guard let callbackURL else {
                    continuation.resume(throwing: SignInError.noToken)
                    return
                }
                let items = URLComponents(url: callbackURL, resolvingAgainstBaseURL: false)?.queryItems ?? []
                if let serverError = items.first(where: { $0.name == "error" })?.value {
                    continuation.resume(throwing: SignInError.server(serverError))
                    return
                }
                guard let token = items.first(where: { $0.name == "token" })?.value, !token.isEmpty else {
                    continuation.resume(throwing: SignInError.noToken)
                    return
                }
                continuation.resume(returning: token)
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false // share the system Google session for SSO
            session.start()
        }
    }

    nonisolated func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        // Find any active key window across connected scenes. Falling back to a fresh window keeps
        // ASWebAuthenticationSession happy on cold launches.
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)
        return window ?? ASPresentationAnchor()
    }
}
