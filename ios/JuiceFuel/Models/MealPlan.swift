import Foundation

enum SlotType: String, Codable, CaseIterable, Identifiable {
    case breakfast = "BREAKFAST"
    case lunch = "LUNCH"
    case dinner = "DINNER"
    case snack = "SNACK"
    case other = "OTHER"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .breakfast: return "Breakfast"
        case .lunch: return "Lunch"
        case .dinner: return "Dinner"
        case .snack: return "Snack"
        case .other: return "Other"
        }
    }

    var symbol: String {
        switch self {
        case .breakfast: return "sunrise"
        case .lunch: return "sun.max"
        case .dinner: return "moon"
        case .snack: return "carrot"
        case .other: return "ellipsis.circle"
        }
    }
}

struct MealPlanRef: Codable, Hashable {
    let id: String
    let householdId: String

    enum CodingKeys: String, CodingKey {
        case id
        case householdId = "household_id"
    }
}

struct MealSlot: Codable, Identifiable, Hashable {
    let id: String
    let mealPlanId: String
    let date: Date
    let dateKey: String
    let slot: SlotType
    let recipeId: String
    let recipe: Recipe?

    enum CodingKeys: String, CodingKey {
        case id
        case mealPlanId = "meal_plan_id"
        case date
        case slot
        case recipeId = "recipe_id"
        case recipe
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        mealPlanId = try container.decode(String.self, forKey: .mealPlanId)

        let rawDate = try container.decode(String.self, forKey: .date)
        dateKey = String(rawDate.prefix(10))
        date = MealPlanDate.date(from: dateKey) ?? Date()

        slot = try container.decode(SlotType.self, forKey: .slot)
        recipeId = try container.decode(String.self, forKey: .recipeId)
        recipe = try container.decodeIfPresent(Recipe.self, forKey: .recipe)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(mealPlanId, forKey: .mealPlanId)
        try container.encode(dateKey, forKey: .date)
        try container.encode(slot, forKey: .slot)
        try container.encode(recipeId, forKey: .recipeId)
        try container.encodeIfPresent(recipe, forKey: .recipe)
    }
}

enum MealPlanDate {
    static func date(from key: String) -> Date? {
        formatter.date(from: key)
    }

    static func key(from date: Date) -> String {
        formatter.string(from: date)
    }

    static func display(_ key: String, format: String = "EEEE, MMM d") -> String {
        guard let date = date(from: key) else { return key }
        let displayFormatter = DateFormatter()
        displayFormatter.calendar = Calendar.current
        displayFormatter.locale = Locale.current
        displayFormatter.dateFormat = format
        return displayFormatter.string(from: date)
    }

    private static let formatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone.current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

/// Lightweight view of a household used to discover the meal-plan id and recipe libraries.
struct HouseholdSummary: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let mealPlan: MealPlanRef?
    let recipeLibraries: [RecipeLibraryRef]?
    let userRole: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case mealPlan = "meal_plan"
        case recipeLibraries = "recipe_libraries"
        case userRole
    }
}

struct RecipeLibraryRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}

struct ActiveHouseholdResponse: Codable, Hashable {
    let household: ActiveHousehold
}

struct ActiveHousehold: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let inviteCode: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case inviteCode = "invite_code"
    }
}

struct MealPlanGenerationResult: Codable, Hashable {
    var suggestion: [MealPlanGeneratedSlot]
    let relaxedConstraints: [String]
}

struct MealPlanGeneratedSlot: Codable, Identifiable, Hashable {
    var date: String
    let mealType: SlotType
    let recipeId: String

    var id: String { "\(date)-\(mealType.rawValue)-\(recipeId)" }

    enum CodingKeys: String, CodingKey {
        case date
        case mealType
        case recipeId
    }
}

struct MealPlanApplyResult: Codable, Hashable {
    let applied: Int
    let skipped: Int
    let entries: [MealSlot]
}
