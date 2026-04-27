import Foundation

enum APIError: Error, LocalizedError {
    case invalidURL
    case badStatus(Int, body: String?)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .badStatus(let code, let body):
            if let body, !body.isEmpty { return "HTTP \(code): \(body)" }
            return "HTTP \(code)"
        case .decoding(let err): return "Decoding failed: \(err.localizedDescription)"
        case .transport(let err): return err.localizedDescription
        }
    }
}

struct APIClient {
    let baseURL: URL
    private let session: URLSession

    static let shared = APIClient(
        baseURL: URL(string: "https://juicefuel.juicecrew.vip")!
    )

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    private func makeRequest(
        _ method: String,
        path: String,
        body: Encodable? = nil,
        authorized: Bool = true
    ) throws -> URLRequest {
        guard let url = URL(string: path, relativeTo: baseURL) else {
            throw APIError.invalidURL
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder.api.encode(AnyEncodable(body))
        }

        if authorized, let token = KeychainStore.get("auth_token") {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return req
    }

    func send<T: Decodable>(
        _ method: String,
        path: String,
        body: Encodable? = nil,
        authorized: Bool = true,
        as type: T.Type = T.self
    ) async throws -> T {
        let req = try makeRequest(method, path: path, body: body, authorized: authorized)
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.badStatus(0, body: nil)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.badStatus(http.statusCode, body: String(data: data, encoding: .utf8))
        }
        do {
            return try JSONDecoder.api.decode(T.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    @discardableResult
    func sendVoid(
        _ method: String,
        path: String,
        body: Encodable? = nil,
        authorized: Bool = true
    ) async throws -> Int {
        let req = try makeRequest(method, path: path, body: body, authorized: authorized)
        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.badStatus(0, body: nil)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.badStatus(http.statusCode, body: String(data: data, encoding: .utf8))
        }
        return http.statusCode
    }
}

// MARK: - JSON helpers

extension JSONEncoder {
    static let api: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()
}

extension JSONDecoder {
    static let api: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
}

// Erases the Encodable existential so it can be encoded directly.
private struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
