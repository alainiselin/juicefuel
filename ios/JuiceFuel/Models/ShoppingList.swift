import Foundation

enum ShoppingListStatus: String, Codable {
    case draft = "DRAFT"
    case active = "ACTIVE"
    case completed = "COMPLETED"
    case archived = "ARCHIVED"
}

struct ShoppingList: Codable, Identifiable, Hashable {
    let id: String
    let householdId: String
    let title: String
    let status: ShoppingListStatus
    let storeHint: String?
    var items: [ShoppingListItem]

    enum CodingKeys: String, CodingKey {
        case id
        case householdId = "household_id"
        case title
        case status
        case storeHint = "store_hint"
        case items
    }
}

struct ShoppingListItem: Codable, Identifiable, Hashable {
    let id: String
    let shoppingListId: String
    let ingredientId: String?
    let articleId: String?
    let quantity: Double?
    let unit: String?
    let note: String?
    var isChecked: Bool
    let ingredient: ShoppingItemIngredient?
    let article: ShoppingItemArticle?
    let tags: [ShoppingItemTag]?

    enum CodingKeys: String, CodingKey {
        case id
        case shoppingListId = "shopping_list_id"
        case ingredientId = "ingredient_id"
        case articleId = "article_id"
        case quantity
        case unit
        case note
        case isChecked = "is_checked"
        case ingredient
        case article
        case tags
    }

    var displayName: String {
        ingredient?.name ?? article?.name ?? "Item"
    }
}

struct ShoppingItemIngredient: Codable, Hashable {
    let id: String
    let name: String
    let defaultUnit: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case defaultUnit = "default_unit"
    }
}

struct ShoppingItemArticle: Codable, Hashable {
    let id: String
    let name: String
    let defaultUnit: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case defaultUnit = "default_unit"
    }
}

struct ShoppingItemTag: Codable, Hashable, Identifiable {
    let id: String
    let label: String
    let kind: String?
}
