import SwiftUI

struct RecipesListView: View {
    @State private var recipes: [Recipe] = []
    @State private var phase: Phase = .loading
    @State private var searchText = ""
    @State private var showingAddSheet = false
    @State private var showingAISheet = false
    @State private var showingURLImportSheet = false

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
                    ToolbarItem(placement: .topBarLeading) {
                        HStack {
                            Button {
                                showingAISheet = true
                            } label: {
                                Image(systemName: "wand.and.stars")
                            }
                            Button {
                                showingURLImportSheet = true
                            } label: {
                                Image(systemName: "link.badge.plus")
                            }
                        }
                    }
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
                .sheet(isPresented: $showingAISheet) {
                    AIRecipeSheet { Task { await load() } }
                }
                .sheet(isPresented: $showingURLImportSheet) {
                    URLRecipeImportSheet { Task { await load() } }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .loading:
            BrandedLoadingView(title: "Loading recipes", subtitle: "Pulling your household library")
        case .empty:
            ContentUnavailableView {
                Label("No recipes yet", systemImage: "book.closed")
            } description: {
                Text("Create one manually, generate a draft, or import a recipe URL.")
            } actions: {
                Button("New Recipe") { showingAddSheet = true }
                    .buttonStyle(.borderedProminent)
                Button("Generate") { showingAISheet = true }
                    .buttonStyle(.bordered)
                Button("Import URL") { showingURLImportSheet = true }
                    .buttonStyle(.bordered)
            }
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
            RecipeDetailView(recipe: recipe) {
                Task { await load() }
            }
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

private struct AIRecipeSheet: View {
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var prompt = ""
    @State private var servings = ""
    @State private var householdId: String?
    @State private var libraries: [RecipeLibrary] = []
    @State private var selectedLibraryId: String?
    @State private var draft: AIRecipeDraft?
    @State private var loading = true
    @State private var generating = false
    @State private var saving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                if loading {
                    Section {
                        HStack {
                            ProgressView()
                            Text("Preparing...")
                        }
                    }
                } else {
                    Section("Idea") {
                        TextField("e.g. quick high-protein pasta", text: $prompt, axis: .vertical)
                            .lineLimit(2...4)
                        TextField("Servings", text: $servings)
                            .keyboardType(.numberPad)
                    }

                    Section("Library") {
                        if libraries.isEmpty {
                            Text("No writable library found")
                                .foregroundStyle(.secondary)
                        } else {
                            Picker("Save to", selection: Binding(
                                get: { selectedLibraryId ?? "" },
                                set: { selectedLibraryId = $0 }
                            )) {
                                ForEach(libraries) { library in
                                    Text(library.name).tag(library.id)
                                }
                            }
                        }
                    }

                    if let draft {
                        Section("Preview") {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(draft.title)
                                    .font(.headline)
                                Text(draft.description)
                                    .foregroundStyle(.secondary)
                                HStack(spacing: 16) {
                                    Label("\(draft.servings)", systemImage: "person.2")
                                    Label("\(draft.times.totalMin) min", systemImage: "clock")
                                    Label("\(draft.ingredients.count)", systemImage: "list.bullet")
                                }
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            }
                        }

                        Section("Ingredients") {
                            ForEach(draft.ingredients.indices, id: \.self) { index in
                                let ingredient = draft.ingredients[index]
                                HStack {
                                    Text(ingredient.name)
                                    Spacer()
                                    if let amount = ingredient.amount {
                                        Text(amount, format: .number)
                                            .foregroundStyle(.secondary)
                                    }
                                    if let unit = ingredient.unit {
                                        Text(unit)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }

                        Section("Steps") {
                            ForEach(draft.steps, id: \.order) { step in
                                Text("\(step.order). \(step.text)")
                            }
                        }

                        if let warnings = draft.warnings, !warnings.isEmpty {
                            Section("Warnings") {
                                ForEach(warnings, id: \.self) { warning in
                                    Text(warning)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("AI recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if draft == nil {
                        Button {
                            Task { await generate() }
                        } label: {
                            if generating { ProgressView() } else { Text("Generate") }
                        }
                        .disabled(!canGenerate || generating || loading)
                    } else {
                        Button {
                            Task { await save() }
                        } label: {
                            if saving { ProgressView() } else { Text("Save") }
                        }
                        .disabled(selectedLibraryId == nil || saving)
                    }
                }
            }
            .task { await loadContext() }
        }
    }

    private var canGenerate: Bool {
        !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && householdId != nil
            && selectedLibraryId != nil
            && (servings.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || parsedServings != nil)
    }

    private var parsedServings: Int? {
        let trimmed = servings.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return 4 }
        guard let value = Int(trimmed), value > 0 else { return nil }
        return value
    }

    private func loadContext() async {
        loading = true
        errorMessage = nil
        defer { loading = false }

        do {
            async let household: ActiveHouseholdResponse = APIClient.shared.send("GET", path: "/api/households/me")
            async let libs: [RecipeLibrary] = APIClient.shared.send("GET", path: "/api/recipe-libraries")
            let (householdResponse, librariesResponse) = try await (household, libs)
            householdId = householdResponse.household.id
            libraries = librariesResponse.filter { $0.isOwnHousehold != false }
            selectedLibraryId = libraries.first?.id
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func generate() async {
        guard let householdId, let parsedServings else { return }
        generating = true
        errorMessage = nil
        defer { generating = false }

        struct Body: Encodable {
            let household_id: String
            let query: String
            let servings: Int
        }

        do {
            let response: AIRecipeGenerationResponse = try await APIClient.shared.send(
                "POST",
                path: "/api/recipes/generate",
                body: Body(
                    household_id: householdId,
                    query: prompt.trimmingCharacters(in: .whitespacesAndNewlines),
                    servings: parsedServings
                )
            )
            draft = response.draft
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() async {
        guard let householdId, let selectedLibraryId, let draft else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let household_id: String
            let recipe_library_id: String
            let draft: AIRecipeDraft
            let source_url: String?
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "POST",
                path: "/api/recipes/generate/save",
                body: Body(
                    household_id: householdId,
                    recipe_library_id: selectedLibraryId,
                    draft: draft,
                    source_url: nil
                )
            )
            onSaved()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct URLRecipeImportSheet: View {
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var recipeURL = ""
    @State private var servings = ""
    @State private var householdId: String?
    @State private var libraries: [RecipeLibrary] = []
    @State private var selectedLibraryId: String?
    @State private var draft: AIRecipeDraft?
    @State private var importedSourceURL: String?
    @State private var loading = true
    @State private var importing = false
    @State private var saving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                if loading {
                    Section {
                        HStack {
                            ProgressView()
                            Text("Preparing...")
                        }
                    }
                } else {
                    Section("Recipe URL") {
                        TextField("https://example.com/recipe", text: $recipeURL)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.URL)
                            .autocorrectionDisabled()
                        TextField("Servings", text: $servings)
                            .keyboardType(.numberPad)
                    }

                    Section("Library") {
                        if libraries.isEmpty {
                            Text("No writable library found")
                                .foregroundStyle(.secondary)
                        } else {
                            Picker("Save to", selection: Binding(
                                get: { selectedLibraryId ?? "" },
                                set: { selectedLibraryId = $0 }
                            )) {
                                ForEach(libraries) { library in
                                    Text(library.name).tag(library.id)
                                }
                            }
                        }
                    }

                    if let draft {
                        Section("Preview") {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(draft.title)
                                    .font(.headline)
                                Text(draft.description)
                                    .foregroundStyle(.secondary)
                                HStack(spacing: 16) {
                                    Label("\(draft.servings)", systemImage: "person.2")
                                    Label("\(draft.times.totalMin) min", systemImage: "clock")
                                    Label("\(draft.ingredients.count)", systemImage: "list.bullet")
                                }
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                if let importedSourceURL {
                                    Text(importedSourceURL)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                            }
                        }

                        Section("Ingredients") {
                            ForEach(draft.ingredients.indices, id: \.self) { index in
                                let ingredient = draft.ingredients[index]
                                HStack {
                                    Text(ingredient.name)
                                    Spacer()
                                    if let amount = ingredient.amount {
                                        Text(amount, format: .number)
                                            .foregroundStyle(.secondary)
                                    }
                                    if let unit = ingredient.unit {
                                        Text(unit)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }

                        Section("Steps") {
                            ForEach(draft.steps, id: \.order) { step in
                                Text("\(step.order). \(step.text)")
                            }
                        }

                        if let warnings = draft.warnings, !warnings.isEmpty {
                            Section("Warnings") {
                                ForEach(warnings, id: \.self) { warning in
                                    Text(warning)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .navigationTitle("Import recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if draft == nil {
                        Button {
                            Task { await importRecipe() }
                        } label: {
                            if importing { ProgressView() } else { Text("Import") }
                        }
                        .disabled(!canImport || importing || loading)
                    } else {
                        Button {
                            Task { await save() }
                        } label: {
                            if saving { ProgressView() } else { Text("Save") }
                        }
                        .disabled(selectedLibraryId == nil || saving)
                    }
                }
            }
            .task { await loadContext() }
        }
    }

    private var canImport: Bool {
        !recipeURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && householdId != nil
            && selectedLibraryId != nil
            && parsedServings != nil
    }

    private var parsedServings: Int? {
        let trimmed = servings.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return nil }
        guard let value = Int(trimmed), value > 0 else { return nil }
        return value
    }

    private func loadContext() async {
        loading = true
        errorMessage = nil
        defer { loading = false }

        do {
            async let household: ActiveHouseholdResponse = APIClient.shared.send("GET", path: "/api/households/me")
            async let libs: [RecipeLibrary] = APIClient.shared.send("GET", path: "/api/recipe-libraries")
            let (householdResponse, librariesResponse) = try await (household, libs)
            householdId = householdResponse.household.id
            libraries = librariesResponse.filter { $0.isOwnHousehold != false }
            selectedLibraryId = libraries.first?.id
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func importRecipe() async {
        guard let householdId else { return }
        importing = true
        errorMessage = nil
        defer { importing = false }

        struct Body: Encodable {
            let household_id: String
            let url: String
            let servings: Int?
        }

        do {
            let response: AIRecipeGenerationResponse = try await APIClient.shared.send(
                "POST",
                path: "/api/recipes/generate/from-url",
                body: Body(
                    household_id: householdId,
                    url: recipeURL.trimmingCharacters(in: .whitespacesAndNewlines),
                    servings: parsedServings
                )
            )
            draft = response.draft
            importedSourceURL = response.sourceURL ?? recipeURL.trimmingCharacters(in: .whitespacesAndNewlines)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() async {
        guard let householdId, let selectedLibraryId, let draft else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let household_id: String
            let recipe_library_id: String
            let draft: AIRecipeDraft
            let source_url: String?
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "POST",
                path: "/api/recipes/generate/save",
                body: Body(
                    household_id: householdId,
                    recipe_library_id: selectedLibraryId,
                    draft: draft,
                    source_url: importedSourceURL
                )
            )
            onSaved()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
