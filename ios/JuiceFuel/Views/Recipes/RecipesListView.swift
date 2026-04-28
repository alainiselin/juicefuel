import SwiftUI

struct RecipesListView: View {
    @State private var recipes: [Recipe] = []
    @State private var phase: Phase = .loading
    @State private var searchText = ""
    @State private var showingAddSheet = false

    enum Phase {
        case loading, loaded, empty, error(String)
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Recipes")
                .searchable(text: $searchText, prompt: "Search recipes")
                .refreshable { await load() }
                .task { await load() }
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            showingAddSheet = true
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
                .sheet(isPresented: $showingAddSheet) {
                    AddRecipeSheet { Task { await load() } }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .loading:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .empty:
            ContentUnavailableView(
                "No recipes yet",
                systemImage: "book.closed",
                description: Text("Add a recipe in the web app at juicefuel.juicecrew.vip — it will show up here.")
            )
        case .error(let message):
            ContentUnavailableView(
                "Couldn't load recipes",
                systemImage: "exclamationmark.triangle",
                description: Text(message)
            )
        case .loaded:
            list
        }
    }

    private var list: some View {
        List(filtered, id: \.id) { recipe in
            NavigationLink(value: recipe) {
                RecipeRow(recipe: recipe)
            }
        }
        .listStyle(.plain)
        .navigationDestination(for: Recipe.self) { recipe in
            RecipeDetailView(recipe: recipe)
        }
    }

    private var filtered: [Recipe] {
        guard !searchText.isEmpty else { return recipes }
        return recipes.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }

    private func load() async {
        do {
            let result: [Recipe] = try await APIClient.shared.send("GET", path: "/api/recipes")
            recipes = result
            phase = result.isEmpty ? .empty : .loaded
        } catch {
            phase = .error(error.localizedDescription)
        }
    }
}

private struct RecipeRow: View {
    let recipe: Recipe

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(recipe.title)
                .font(.body.weight(.medium))
            if let description = recipe.description, !description.isEmpty {
                Text(description)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            HStack(spacing: 12) {
                if let prep = recipe.prepTimeMinutes {
                    Label("\(prep) min", systemImage: "clock")
                }
                if let servings = recipe.baseServings {
                    Label("\(servings) servings", systemImage: "person.2")
                }
                let count = recipe.ingredients?.count ?? 0
                if count > 0 {
                    Label("\(count) ingredients", systemImage: "list.bullet")
                }
            }
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    RecipesListView()
}
