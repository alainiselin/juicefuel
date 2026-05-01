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
    let recipeId: String?
    let title: String?
    let recipe: Recipe?

    enum CodingKeys: String, CodingKey {
        case id
        case mealPlanId = "meal_plan_id"
        case date
        case slot
        case recipeId = "recipe_id"
        case title
        case recipe
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        mealPlanId = try container.decode(String.self, forKey: .mealPlanId)

        let rawDate = try container.decode(String.self, forKey: .date)
        dateKey = MealPlanDate.key(fromAPIValue: rawDate)
        date = MealPlanDate.date(from: dateKey) ?? Date()

        slot = try container.decode(SlotType.self, forKey: .slot)
        recipeId = try container.decodeIfPresent(String.self, forKey: .recipeId)
        title = try container.decodeIfPresent(String.self, forKey: .title)
        recipe = try container.decodeIfPresent(Recipe.self, forKey: .recipe)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(mealPlanId, forKey: .mealPlanId)
        try container.encode(dateKey, forKey: .date)
        try container.encode(slot, forKey: .slot)
        try container.encodeIfPresent(recipeId, forKey: .recipeId)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encodeIfPresent(recipe, forKey: .recipe)
    }

    /// What to show as the slot's name: recipe title if attached, else the free-text title.
    var displayTitle: String {
        recipe?.title ?? title ?? "Untitled meal"
    }
}

enum MealPlanDate {
    static func key(fromAPIValue value: String) -> String {
        if value.count == 10, !value.contains("T") {
            return value
        }
        if let date = timestampWithFractionalSeconds.date(from: value)
            ?? timestamp.date(from: value) {
            return key(from: date)
        }
        return String(value.prefix(10))
    }

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

    private static let timestampWithFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    private static let timestamp: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
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
