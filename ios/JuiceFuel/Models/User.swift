import Foundation

struct User: Codable, Identifiable, Hashable {
    let id: String
    let email: String?
    let displayName: String?
    let avatarURL: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case displayName = "display_name"
        case avatarURL = "avatar_url"
    }
}

struct AuthResponse: Codable {
    let user: User
    let token: String
}
