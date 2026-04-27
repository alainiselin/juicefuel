import Foundation

struct Recipe: Codable, Identifiable, Hashable {
    let id: String
    let recipeLibraryId: String
    let title: String
    let description: String?
    let sourceURL: String?
    let instructionsMarkdown: String?
    let baseServings: Int?
    let prepTimeMinutes: Int?
    let createdAt: Date?
    let updatedAt: Date?

    let ingredients: [RecipeIngredient]?
    let tags: [RecipeTagJoin]?

    enum CodingKeys: String, CodingKey {
        case id
        case recipeLibraryId = "recipe_library_id"
        case title
        case description
        case sourceURL = "source_url"
        case instructionsMarkdown = "instructions_markdown"
        case baseServings = "base_servings"
        case prepTimeMinutes = "prep_time_minutes"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case ingredients
        case tags
    }
}

struct RecipeIngredient: Codable, Hashable {
    let recipeId: String?
    let ingredientId: String
    let quantity: Decimal?
    let unit: String?
    let note: String?
    let ingredient: Ingredient?

    enum CodingKeys: String, CodingKey {
        case recipeId = "recipe_id"
        case ingredientId = "ingredient_id"
        case quantity
        case unit
        case note
        case ingredient
    }
}

struct Ingredient: Codable, Hashable {
    let id: String
    let name: String
    let defaultUnit: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case defaultUnit = "default_unit"
    }
}

struct RecipeTagJoin: Codable, Hashable {
    let tag: Tag
}

struct Tag: Codable, Hashable, Identifiable {
    let id: String
    let name: String
    let slug: String?
    let kind: String?
}
