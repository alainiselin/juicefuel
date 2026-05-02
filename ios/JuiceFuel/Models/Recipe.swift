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

struct RecipeIngredient: Codable, Hashable, Identifiable {
    let recipeId: String?
    let ingredientId: String
    let quantity: Decimal?
    let unit: String?
    let note: String?
    let ingredient: Ingredient?

    var id: String {
        if let recipeId {
            return "\(recipeId)-\(ingredientId)"
        }
        return ingredientId
    }

    enum CodingKeys: String, CodingKey {
        case recipeId = "recipe_id"
        case ingredientId = "ingredient_id"
        case quantity
        case unit
        case note
        case ingredient
    }

    init(
        recipeId: String?,
        ingredientId: String,
        quantity: Decimal?,
        unit: String?,
        note: String?,
        ingredient: Ingredient?
    ) {
        self.recipeId = recipeId
        self.ingredientId = ingredientId
        self.quantity = quantity
        self.unit = unit
        self.note = note
        self.ingredient = ingredient
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        recipeId = try container.decodeIfPresent(String.self, forKey: .recipeId)
        ingredientId = try container.decode(String.self, forKey: .ingredientId)
        quantity = try container.decodeFlexibleDecimalIfPresent(forKey: .quantity)
        unit = try container.decodeIfPresent(String.self, forKey: .unit)
        note = try container.decodeIfPresent(String.self, forKey: .note)
        ingredient = try container.decodeIfPresent(Ingredient.self, forKey: .ingredient)
    }
}

private extension KeyedDecodingContainer {
    func decodeFlexibleDecimalIfPresent(forKey key: Key) throws -> Decimal? {
        if try decodeNil(forKey: key) {
            return nil
        }
        if let decimal = try? decode(Decimal.self, forKey: key) {
            return decimal
        }
        if let double = try? decode(Double.self, forKey: key) {
            return Decimal(double)
        }
        if let string = try? decode(String.self, forKey: key), !string.isEmpty {
            return Decimal(string: string, locale: Locale(identifier: "en_US_POSIX"))
        }
        return nil
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

struct IngredientSearchResult: Codable, Identifiable, Hashable {
    let id: String
    let canonicalName: String
    let defaultUnit: String?

    enum CodingKeys: String, CodingKey {
        case id
        case canonicalName = "canonical_name"
        case defaultUnit = "default_unit"
    }
}

struct RecipeLibrary: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let householdId: String?
    let isPublic: Bool?
    let recipeCount: Int?
    let isOwnHousehold: Bool?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case householdId = "household_id"
        case isPublic = "is_public"
        case recipeCount = "recipe_count"
        case isOwnHousehold = "is_own_household"
    }
}

struct RecipeFavorite: Codable, Identifiable, Hashable {
    let id: String
    let recipeId: String
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case recipeId = "recipe_id"
        case createdAt = "created_at"
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
    let scope: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case label
        case slug
        case kind
        case scope
    }

    init(id: String, name: String, slug: String? = nil, kind: String? = nil, scope: String? = nil) {
        self.id = id
        self.name = name
        self.slug = slug
        self.kind = kind
        self.scope = scope
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        name = try container.decodeIfPresent(String.self, forKey: .name)
            ?? container.decodeIfPresent(String.self, forKey: .label)
            ?? ""
        slug = try container.decodeIfPresent(String.self, forKey: .slug)
        kind = try container.decodeIfPresent(String.self, forKey: .kind)
        scope = try container.decodeIfPresent(String.self, forKey: .scope)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(slug, forKey: .slug)
        try container.encodeIfPresent(kind, forKey: .kind)
        try container.encodeIfPresent(scope, forKey: .scope)
    }
}

struct AIRecipeGenerationResponse: Codable, Hashable {
    let draft: AIRecipeDraft
    let sourceURL: String?

    enum CodingKeys: String, CodingKey {
        case draft
        case sourceURL = "source_url"
    }
}

struct AIRecipeDraft: Codable, Hashable {
    let title: String
    let description: String
    let servings: Int
    let times: AIRecipeTimes
    let ingredients: [AIRecipeDraftIngredient]
    let steps: [AIRecipeDraftStep]
    let tags: AIRecipeDraftTags
    let warnings: [String]?
    let ai: AIRecipeMetadata
}

struct AIRecipeTimes: Codable, Hashable {
    let prepMin: Int
    let cookMin: Int
    let totalMin: Int

    enum CodingKeys: String, CodingKey {
        case prepMin = "prep_min"
        case cookMin = "cook_min"
        case totalMin = "total_min"
    }
}

struct AIRecipeDraftIngredient: Codable, Hashable {
    let name: String
    let amount: Double?
    let unit: String?
    let note: String?
}

struct AIRecipeDraftStep: Codable, Hashable {
    let order: Int
    let text: String
}

struct AIRecipeDraftTags: Codable, Hashable {
    let cuisine: [String]
    let flavor: [String]
    let diet: [String]
    let allergen: [String]
    let technique: [String]
    let time: [String]
    let cost: [String]

    enum CodingKeys: String, CodingKey {
        case cuisine = "CUISINE"
        case flavor = "FLAVOR"
        case diet = "DIET"
        case allergen = "ALLERGEN"
        case technique = "TECHNIQUE"
        case time = "TIME"
        case cost = "COST"
    }
}

struct AIRecipeMetadata: Codable, Hashable {
    let generated: Bool
    let model: String
}
