import SwiftUI

struct RecipeDetailView: View {
    let recipe: Recipe
    var onChanged: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var fullRecipe: Recipe?
    @State private var loadError: String?
    @State private var showingEditSheet = false
    @State private var showingAddIngredientSheet = false
    @State private var showingTagSheet = false
    @State private var editingIngredient: RecipeIngredient?
    @State private var showingDeleteConfirmation = false
    @State private var deleting = false
    @State private var isFavorite = false
    @State private var togglingFavorite = false

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

                section {
                    HStack {
                        Text("Tags")
                            .font(.headline)
                        Spacer()
                        Button {
                            showingTagSheet = true
                        } label: {
                            Label("Add tag", systemImage: "plus.circle")
                                .labelStyle(.iconOnly)
                        }
                    }
                } content: {
                    let tags = display.tags?.map(\.tag) ?? []
                    if tags.isEmpty {
                        Text("No tags yet")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    } else {
                        tagsRow(tags)
                    }
                }

                section {
                    HStack {
                        Text("Ingredients")
                            .font(.headline)
                        Spacer()
                        Button {
                            editingIngredient = nil
                            showingAddIngredientSheet = true
                        } label: {
                            Label("Add ingredient", systemImage: "plus.circle")
                                .labelStyle(.iconOnly)
                        }
                    }
                } content: {
                    if let ingredients = display.ingredients, !ingredients.isEmpty {
                        VStack(spacing: 10) {
                            ForEach(ingredients, id: \.ingredientId) { ing in
                                ingredientRow(ing)
                                    .contentShape(Rectangle())
                                    .onTapGesture {
                                        editingIngredient = ing
                                    }
                            }
                        }
                    } else {
                        Text("No ingredients yet")
                            .font(.callout)
                            .foregroundStyle(.secondary)
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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Task { await toggleFavorite() }
                } label: {
                    if togglingFavorite {
                        ProgressView()
                    } else {
                        Image(systemName: isFavorite ? "star.fill" : "star")
                    }
                }
                .disabled(togglingFavorite)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        showingEditSheet = true
                    } label: {
                        Label("Edit", systemImage: "pencil")
                    }
                    Button(role: .destructive) {
                        showingDeleteConfirmation = true
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                } label: {
                    if deleting {
                        ProgressView()
                    } else {
                        Image(systemName: "ellipsis.circle")
                    }
                }
                .disabled(deleting)
            }
        }
        .task {
            await loadFull()
            await loadFavoriteStatus()
        }
        .refreshable { await loadFull() }
        .sheet(isPresented: $showingEditSheet) {
            AddRecipeSheet(existingRecipe: display) {
                onChanged?()
                Task { await loadFull() }
            }
        }
        .sheet(isPresented: $showingAddIngredientSheet) {
            RecipeIngredientSheet(
                recipeId: recipe.id,
                existingIngredient: nil,
                existingIngredientIds: Set(display.ingredients?.map(\.ingredientId) ?? [])
            ) {
                Task { await loadFull() }
            }
        }
        .sheet(isPresented: $showingTagSheet) {
            RecipeTagSheet(
                recipeId: recipe.id,
                attachedTags: display.tags?.map(\.tag) ?? []
            ) {
                Task { await loadFull() }
            }
        }
        .sheet(item: $editingIngredient) { ingredient in
            RecipeIngredientSheet(
                recipeId: recipe.id,
                existingIngredient: ingredient,
                existingIngredientIds: Set(display.ingredients?.map(\.ingredientId) ?? [])
            ) {
                Task { await loadFull() }
            }
        }
        .confirmationDialog(
            "Delete this recipe?",
            isPresented: $showingDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete recipe", role: .destructive) {
                Task { await deleteRecipe() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This removes the recipe from the library.")
        }
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
                    Button {
                        Task { await removeTag(tag) }
                    } label: {
                        HStack(spacing: 4) {
                            Text(tag.name)
                            Image(systemName: "xmark")
                                .font(.caption2)
                        }
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.15), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func section<Header: View, Content: View>(
        @ViewBuilder header: () -> Header,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            header()
            content()
        }
        .padding(.top, 8)
    }

    private func section<Content: View>(_ title: String, @ViewBuilder content: () -> Content) -> some View {
        section {
            Text(title)
                .font(.headline)
        } content: {
            content()
        }
    }

    private func ingredientRow(_ ing: RecipeIngredient) -> some View {
        let amount: String? = {
            guard let q = ing.quantity else { return nil }
            let formatted = NumberFormatter.localizedString(from: q as NSDecimalNumber, number: .decimal)
            if let unit = ing.unit { return "\(formatted) \(unit.lowercased())" }
            return formatted
        }()
        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(ing.ingredient?.name ?? "Unknown")
                if let note = ing.note, !note.isEmpty {
                    Text(note)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
            if let amount {
                Text(amount)
                    .foregroundStyle(.secondary)
            }
            Menu {
                Button {
                    editingIngredient = ing
                } label: {
                    Label("Edit", systemImage: "pencil")
                }
                Button(role: .destructive) {
                    Task { await deleteIngredient(ing) }
                } label: {
                    Label("Delete", systemImage: "trash")
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
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

    private func deleteRecipe() async {
        deleting = true
        loadError = nil
        defer { deleting = false }

        do {
            _ = try await APIClient.shared.sendVoid("DELETE", path: "/api/recipes/\(recipe.id)")
            onChanged?()
            dismiss()
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func deleteIngredient(_ ingredient: RecipeIngredient) async {
        loadError = nil
        do {
            let recipeIngredientId = "\(recipe.id)-\(ingredient.ingredientId)"
            _ = try await APIClient.shared.sendVoid(
                "DELETE",
                path: "/api/recipes/\(recipe.id)/ingredients/\(recipeIngredientId)"
            )
            await loadFull()
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func loadFavoriteStatus() async {
        do {
            let favorites: [RecipeFavorite] = try await APIClient.shared.send("GET", path: "/api/user/favorites")
            isFavorite = favorites.contains { $0.recipeId == recipe.id }
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func toggleFavorite() async {
        togglingFavorite = true
        loadError = nil
        defer { togglingFavorite = false }

        struct Body: Encodable {
            let recipe_id: String
        }

        do {
            if isFavorite {
                _ = try await APIClient.shared.sendVoid(
                    "DELETE",
                    path: "/api/user/favorites",
                    body: Body(recipe_id: recipe.id)
                )
                isFavorite = false
            } else {
                _ = try await APIClient.shared.sendVoid(
                    "POST",
                    path: "/api/user/favorites",
                    body: Body(recipe_id: recipe.id)
                )
                isFavorite = true
            }
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func removeTag(_ tag: Tag) async {
        loadError = nil
        do {
            _ = try await APIClient.shared.sendVoid(
                "DELETE",
                path: "/api/recipes/\(recipe.id)/tags/\(tag.id)"
            )
            await loadFull()
        } catch {
            loadError = error.localizedDescription
        }
    }
}

private struct RecipeTagSheet: View {
    let recipeId: String
    let attachedTags: [Tag]
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var query = ""
    @State private var householdId: String?
    @State private var results: [Tag] = []
    @State private var loading = true
    @State private var savingTagIds: Set<String> = []
    @State private var errorMessage: String?

    private var attachedIds: Set<String> {
        Set(attachedTags.map(\.id))
    }

    var body: some View {
        NavigationStack {
            List {
                Section("Search") {
                    TextField("Search tags", text: $query)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: query) { _, _ in
                            Task { await searchTags() }
                        }
                }

                if loading {
                    HStack {
                        ProgressView()
                        Text("Loading tags...")
                    }
                }

                if !attachedTags.isEmpty {
                    Section("Attached") {
                        ForEach(attachedTags) { tag in
                            HStack {
                                Text(tag.name)
                                Spacer()
                                Text(tag.kind ?? "")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }

                Section("Available") {
                    ForEach(results.filter { !attachedIds.contains($0.id) }) { tag in
                        Button {
                            Task { await addTag(tag) }
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(tag.name)
                                    if let kind = tag.kind {
                                        Text(kind.lowercased())
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if savingTagIds.contains(tag.id) {
                                    ProgressView()
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
            .navigationTitle("Tags")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }

        do {
            let response: ActiveHouseholdResponse = try await APIClient.shared.send("GET", path: "/api/households/me")
            householdId = response.household.id
            await searchTags()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func searchTags() async {
        guard let householdId else { return }
        do {
            let encoded = query
                .trimmingCharacters(in: .whitespacesAndNewlines)
                .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            results = try await APIClient.shared.send(
                "GET",
                path: "/api/tags?household_id=\(householdId)&query=\(encoded)&limit=50"
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func addTag(_ tag: Tag) async {
        savingTagIds.insert(tag.id)
        errorMessage = nil
        defer { savingTagIds.remove(tag.id) }

        struct Body: Encodable {
            let tag_id: String
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "POST",
                path: "/api/recipes/\(recipeId)/tags",
                body: Body(tag_id: tag.id)
            )
            onSaved()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct RecipeIngredientSheet: View {
    let recipeId: String
    let existingIngredient: RecipeIngredient?
    let existingIngredientIds: Set<String>
    var onSaved: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var query = ""
    @State private var results: [IngredientSearchResult] = []
    @State private var selectedIngredient: IngredientSearchResult?
    @State private var quantity = ""
    @State private var unit = "G"
    @State private var note = ""
    @State private var searching = false
    @State private var saving = false
    @State private var deleting = false
    @State private var errorMessage: String?

    private let units = ["G", "KG", "ML", "L", "TBSP", "TSP", "CUP", "PIECE", "PACKAGE", "OTHER"]

    init(
        recipeId: String,
        existingIngredient: RecipeIngredient?,
        existingIngredientIds: Set<String>,
        onSaved: @escaping () -> Void
    ) {
        self.recipeId = recipeId
        self.existingIngredient = existingIngredient
        self.existingIngredientIds = existingIngredientIds
        self.onSaved = onSaved
        _quantity = State(initialValue: existingIngredient?.quantity.map(Self.decimalString) ?? "")
        _unit = State(initialValue: existingIngredient?.unit ?? "G")
        _note = State(initialValue: existingIngredient?.note ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                if existingIngredient == nil {
                    Section("Ingredient") {
                        TextField("Search ingredients", text: $query)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: query) { _, _ in
                                Task { await search() }
                            }

                        if searching {
                            HStack {
                                ProgressView()
                                Text("Searching...")
                            }
                        }

                        ForEach(filteredResults) { result in
                            Button {
                                selectedIngredient = result
                                query = result.canonicalName
                                unit = result.defaultUnit ?? unit
                                results = []
                            } label: {
                                HStack {
                                    Text(result.canonicalName)
                                    Spacer()
                                    if selectedIngredient?.id == result.id {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                            .disabled(existingIngredientIds.contains(result.id))
                        }
                    }
                } else if let ingredient = existingIngredient {
                    Section("Ingredient") {
                        Text(ingredient.ingredient?.name ?? "Ingredient")
                    }
                }

                Section("Amount") {
                    TextField("Quantity", text: $quantity)
                        .keyboardType(.decimalPad)
                    Picker("Unit", selection: $unit) {
                        ForEach(units, id: \.self) { unit in
                            Text(unit.lowercased()).tag(unit)
                        }
                    }
                    TextField("Note", text: $note, axis: .vertical)
                        .lineLimit(1...3)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }

                if existingIngredient != nil {
                    Section {
                        Button("Delete ingredient", role: .destructive) {
                            Task { await deleteIngredient() }
                        }
                        .disabled(deleting || saving)
                    }
                }
            }
            .navigationTitle(existingIngredient == nil ? "Add ingredient" : "Edit ingredient")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if saving { ProgressView() } else { Text("Save") }
                    }
                    .disabled(!canSave || saving || deleting)
                }
            }
        }
    }

    private var canSave: Bool {
        parsedQuantity != nil && (existingIngredient != nil || selectedIngredient != nil)
    }

    private var parsedQuantity: Double? {
        let normalized = quantity.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: ",", with: ".")
        guard let value = Double(normalized), value > 0 else { return nil }
        return value
    }

    private var filteredResults: [IngredientSearchResult] {
        results.filter { $0.id == selectedIngredient?.id || !existingIngredientIds.contains($0.id) }
    }

    private func search() async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            results = []
            return
        }

        searching = true
        defer { searching = false }

        do {
            let encoded = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
            results = try await APIClient.shared.send(
                "GET",
                path: "/api/ingredients?query=\(encoded)&limit=10&recipe_only=true"
            )
        } catch {
            errorMessage = error.localizedDescription
            results = []
        }
    }

    private func save() async {
        guard let parsedQuantity else {
            errorMessage = "Quantity must be greater than zero."
            return
        }

        saving = true
        errorMessage = nil
        defer { saving = false }

        do {
            if let existingIngredient {
                struct UpdateBody: Encodable {
                    let quantity: Double
                    let unit: String
                    let note: String?
                }
                let recipeIngredientId = "\(recipeId)-\(existingIngredient.ingredientId)"
                let body = UpdateBody(
                    quantity: parsedQuantity,
                    unit: unit,
                    note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note
                )
                _ = try await APIClient.shared.sendVoid(
                    "PATCH",
                    path: "/api/recipes/\(recipeId)/ingredients/\(recipeIngredientId)",
                    body: body
                )
            } else if let selectedIngredient {
                struct CreateBody: Encodable {
                    let ingredient_id: String
                    let quantity: Double
                    let unit: String
                    let note: String?
                }
                let body = CreateBody(
                    ingredient_id: selectedIngredient.id,
                    quantity: parsedQuantity,
                    unit: unit,
                    note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note
                )
                _ = try await APIClient.shared.sendVoid(
                    "POST",
                    path: "/api/recipes/\(recipeId)/ingredients",
                    body: body
                )
            }

            onSaved()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteIngredient() async {
        guard let existingIngredient else { return }
        deleting = true
        errorMessage = nil
        defer { deleting = false }

        do {
            let recipeIngredientId = "\(recipeId)-\(existingIngredient.ingredientId)"
            _ = try await APIClient.shared.sendVoid(
                "DELETE",
                path: "/api/recipes/\(recipeId)/ingredients/\(recipeIngredientId)"
            )
            onSaved()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private static func decimalString(_ value: Decimal) -> String {
        NumberFormatter.localizedString(from: value as NSDecimalNumber, number: .decimal)
    }
}
