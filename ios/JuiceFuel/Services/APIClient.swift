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
        case .decoding(let err): return "Decoding failed: \(APIClientDecoding.describe(err))"
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
            APIClientDecoding.log(error, method: method, path: path, data: data)
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
        d.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let value = try container.decode(String.self)

            if let date = APIClientDateFormatters.iso8601WithFractionalSeconds.date(from: value)
                ?? APIClientDateFormatters.iso8601.date(from: value)
                ?? APIClientDateFormatters.dateOnly.date(from: value) {
                return date
            }

            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Invalid API date: \(value)"
            )
        }
        return d
    }()
}

private enum APIClientDateFormatters {
    static let iso8601WithFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let iso8601: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static let dateOnly: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

private enum APIClientDecoding {
    static func describe(_ error: Error) -> String {
        guard let decodingError = error as? DecodingError else {
            return error.localizedDescription
        }

        switch decodingError {
        case .typeMismatch(let type, let context):
            return "type mismatch for \(type) at \(path(context.codingPath)): \(context.debugDescription)"
        case .valueNotFound(let type, let context):
            return "missing value for \(type) at \(path(context.codingPath)): \(context.debugDescription)"
        case .keyNotFound(let key, let context):
            return "missing key '\(key.stringValue)' at \(path(context.codingPath)): \(context.debugDescription)"
        case .dataCorrupted(let context):
            return "corrupt data at \(path(context.codingPath)): \(context.debugDescription)"
        @unknown default:
            return error.localizedDescription
        }
    }

    static func log(_ error: Error, method: String, path: String, data: Data) {
        print("[API Decode] \(method) \(path) failed: \(describe(error))")
        if let body = String(data: data.prefix(1200), encoding: .utf8) {
            print("[API Decode] Response preview: \(body)")
        }
    }

    private static func path(_ codingPath: [CodingKey]) -> String {
        guard !codingPath.isEmpty else { return "<root>" }
        return codingPath.map { key in
            if let index = key.intValue {
                return "[\(index)]"
            }
            return ".\(key.stringValue)"
        }.joined()
    }
}

// Erases the Encodable existential so it can be encoded directly.
private struct AnyEncodable: Encodable {
    let value: Encodable
    init(_ value: Encodable) { self.value = value }
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}
