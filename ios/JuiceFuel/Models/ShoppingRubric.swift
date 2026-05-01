import Foundation

/// Fixed supermarket-walking rubrics. Mirrors `app/utils/ingredientFormatting.ts` on web —
/// keep the order and slugs in sync.
struct ShoppingRubric: Identifiable, Hashable {
    let id: String  // also the slug
    let name: String
}

enum ShoppingRubrics {
    static let all: [ShoppingRubric] = [
        .init(id: "fruits-vegetables",   name: "Fruits & Vegetables"),
        .init(id: "bread-pastries",      name: "Bread & Pastries"),
        .init(id: "milk-cheese",         name: "Milk & Cheese"),
        .init(id: "meat-fish",           name: "Meat & Fish"),
        .init(id: "ingredients-spices", name: "Ingredients & Spices"),
        .init(id: "grain-products",      name: "Grain Products"),
        .init(id: "frozen-convenience",  name: "Frozen & Convenience"),
        .init(id: "snacks-sweets",       name: "Snacks & Sweets"),
        .init(id: "beverages",           name: "Beverages"),
        .init(id: "household",           name: "Household"),
        .init(id: "care-health",         name: "Care & Health"),
        .init(id: "pet-supplies",        name: "Pet Supplies"),
        .init(id: "home-garden",         name: "Home & Garden"),
        .init(id: "own-items",           name: "Own Items"),
    ]

    static let byId: [String: ShoppingRubric] = Dictionary(
        uniqueKeysWithValues: all.map { ($0.id, $0) }
    )

    /// First AISLE tag's slug determines the rubric. Fallback to `own-items`.
    static func rubric(for item: ShoppingListItem) -> ShoppingRubric {
        if let aisleSlug = item.tags?.first(where: { $0.kind == "AISLE" })?.slug,
           let rubric = byId[aisleSlug] {
            return rubric
        }
        return byId["own-items"]!
    }
}

/// Format quantity + unit for display, matching the web `formatQuantityUnit`.
enum ShoppingFormat {
    static func quantity(_ q: Double?) -> String {
        guard let q else { return "" }
        if q == q.rounded() { return String(Int(q)) }
        // Trim trailing zeros after a 2-decimal format.
        let s = String(format: "%.2f", q)
        return s.replacingOccurrences(of: #"\.?0+$"#, with: "", options: .regularExpression)
    }

    static func unit(_ u: String?) -> String {
        guard let u else { return "" }
        switch u {
        case "G": return "g"
        case "KG": return "kg"
        case "ML": return "ml"
        case "L": return "L"
        case "TBSP": return "tbsp"
        case "TSP": return "tsp"
        case "CUP": return "cup"
        case "PIECE": return "piece"
        case "PACKAGE": return "package"
        case "OTHER": return ""
        default: return u.lowercased()
        }
    }
}
