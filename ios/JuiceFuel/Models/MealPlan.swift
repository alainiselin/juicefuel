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
}

/// Lightweight view of a household used to discover the meal-plan id and recipe libraries.
struct HouseholdSummary: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let mealPlan: MealPlanRef?
    let recipeLibraries: [RecipeLibraryRef]?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case mealPlan = "meal_plan"
        case recipeLibraries = "recipe_libraries"
    }
}

struct RecipeLibraryRef: Codable, Identifiable, Hashable {
    let id: String
    let name: String
}
