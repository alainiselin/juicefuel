import Foundation
import Observation
import AuthenticationServices

@Observable
@MainActor
final class AuthService {
    static let shared = AuthService()

    private(set) var currentUser: User?
    private(set) var isLoading = false
    var errorMessage: String?

    var isSignedIn: Bool { currentUser != nil }

    private static let tokenKey = "auth_token"

    // MARK: - Email / password

    func login(email: String, password: String) async {
        await runAuth {
            try await APIClient.shared.send(
                "POST",
                path: "/api/auth/login",
                body: ["email": email, "password": password],
                authorized: false,
                as: AuthResponse.self
            )
        }
    }

    func signup(email: String, password: String, displayName: String) async {
        await runAuth {
            try await APIClient.shared.send(
                "POST",
                path: "/api/auth/signup",
                body: ["email": email, "password": password, "display_name": displayName],
                authorized: false,
                as: AuthResponse.self
            )
        }
    }

    // MARK: - Sign in with Apple

    struct ApplePayload: Encodable {
        let identity_token: String
        let email: String?
        let display_name: String?
    }

    func signInWithApple(authorization: ASAuthorization) async {
        guard
            let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
            let tokenData = credential.identityToken,
            let identityToken = String(data: tokenData, encoding: .utf8)
        else {
            errorMessage = "Apple sign-in returned no identity token"
            return
        }

        let displayName: String?
        if let names = credential.fullName {
            let parts = [names.givenName, names.familyName].compactMap { $0 }
            displayName = parts.isEmpty ? nil : parts.joined(separator: " ")
        } else {
            displayName = nil
        }

        let payload = ApplePayload(
            identity_token: identityToken,
            email: credential.email,
            display_name: displayName
        )

        await runAuth {
            try await APIClient.shared.send(
                "POST",
                path: "/api/auth/apple",
                body: payload,
                authorized: false,
                as: AuthResponse.self
            )
        }
    }

    // MARK: - External-flow token handoff

    /// Used when a third-party flow (e.g. Google via ASWebAuthenticationSession) hands us a
    /// session token directly. Stores it and hydrates currentUser from /api/profile.
    func acceptToken(_ token: String) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        KeychainStore.set(token, for: Self.tokenKey)
        do {
            let user: User = try await APIClient.shared.send("GET", path: "/api/profile")
            currentUser = user
        } catch {
            // The token is unusable — drop it to avoid a stuck signed-in state.
            KeychainStore.delete(Self.tokenKey)
            currentUser = nil
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Google sign-in

    func signInWithGoogle() async {
        errorMessage = nil
        do {
            let token = try await GoogleSignInService.shared.signIn()
            await acceptToken(token)
        } catch GoogleSignInService.SignInError.cancelled {
            // User cancelled — silent.
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Session restore

    func restoreSession() async {
        guard KeychainStore.get(Self.tokenKey) != nil else { return }
        do {
            let user: User = try await APIClient.shared.send("GET", path: "/api/profile")
            currentUser = user
        } catch {
            // Token is invalid or expired — clear it.
            KeychainStore.delete(Self.tokenKey)
            currentUser = nil
        }
    }

    func signOut() {
        Task {
            // Best-effort server-side logout; ignore errors.
            _ = try? await APIClient.shared.sendVoid("POST", path: "/api/auth/logout")
            KeychainStore.delete(Self.tokenKey)
            currentUser = nil
        }
    }

    // MARK: - Helpers

    private func runAuth(_ work: () async throws -> AuthResponse) async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let response = try await work()
            KeychainStore.set(response.token, for: Self.tokenKey)
            currentUser = response.user
        } catch let APIError.badStatus(_, body) {
            errorMessage = parseErrorMessage(body) ?? "Sign-in failed"
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func parseErrorMessage(_ body: String?) -> String? {
        guard let body, let data = body.data(using: .utf8) else { return nil }
        struct ErrorBody: Decodable { let message: String? }
        return (try? JSONDecoder().decode(ErrorBody.self, from: data))?.message
    }
}
