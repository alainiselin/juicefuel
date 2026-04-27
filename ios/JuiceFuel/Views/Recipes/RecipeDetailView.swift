import SwiftUI

struct RecipeDetailView: View {
    let recipe: Recipe

    @State private var fullRecipe: Recipe?
    @State private var loadError: String?

    var body: some View {
        let display = fullRecipe ?? recipe

        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(display.title)
                    .font(.largeTitle.bold())

                if let description = display.description, !description.isEmpty {
                    Text(description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }

                metaRow(for: display)

                if let tags = display.tags, !tags.isEmpty {
                    tagsRow(tags.map(\.tag))
                }

                if let ingredients = display.ingredients, !ingredients.isEmpty {
                    section("Ingredients") {
                        ForEach(ingredients, id: \.ingredientId) { ing in
                            ingredientRow(ing)
                        }
                    }
                }

                if let instructions = display.instructionsMarkdown, !instructions.isEmpty {
                    section("Instructions") {
                        Text(.init(instructions))
                            .font(.body)
                    }
                }

                if let url = display.sourceURL.flatMap(URL.init(string:)) {
                    Link("View source", destination: url)
                        .font(.callout)
                }

                if let loadError {
                    Text(loadError).font(.footnote).foregroundStyle(.red)
                }
            }
            .padding()
        }
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadFull() }
    }

    private func metaRow(for recipe: Recipe) -> some View {
        HStack(spacing: 16) {
            if let prep = recipe.prepTimeMinutes {
                Label("\(prep) min", systemImage: "clock")
            }
            if let servings = recipe.baseServings {
                Label("\(servings) servings", systemImage: "person.2")
            }
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }

    private func tagsRow(_ tags: [Tag]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(tags) { tag in
                    Text(tag.name)
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.15), in: Capsule())
                }
            }
        }
    }

    @ViewBuilder
    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)
            content()
        }
        .padding(.top, 8)
    }

    private func ingredientRow(_ ing: RecipeIngredient) -> some View {
        let amount: String? = {
            guard let q = ing.quantity else { return nil }
            let formatted = NumberFormatter.localizedString(from: q as NSDecimalNumber, number: .decimal)
            if let unit = ing.unit { return "\(formatted) \(unit.lowercased())" }
            return formatted
        }()
        return HStack(alignment: .firstTextBaseline) {
            Text(ing.ingredient?.name ?? "Unknown")
            Spacer()
            if let amount {
                Text(amount).foregroundStyle(.secondary)
            }
        }
    }

    private func loadFull() async {
        // The list endpoint already includes ingredients + tags, but a fresh fetch
        // ensures we get the latest data when the user opens detail.
        do {
            let fresh: Recipe = try await APIClient.shared.send("GET", path: "/api/recipes/\(recipe.id)")
            fullRecipe = fresh
        } catch {
            loadError = error.localizedDescription
        }
    }
}
