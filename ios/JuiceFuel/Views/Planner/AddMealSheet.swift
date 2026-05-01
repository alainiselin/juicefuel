import SwiftUI

struct AddMealSheet: View {
    let mealPlanId: String
    let dateKey: String
    let existingSlot: MealSlot?

    var onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var slot: SlotType
    @State private var mode: Mode
    @State private var recipes: [Recipe] = []
    @State private var selectedRecipeId: String?
    @State private var customTitle: String
    @State private var phase: Phase = .loading
    @State private var errorMessage: String?
    @State private var saving = false

    enum Phase { case loading, loaded, error(String) }
    enum Mode: String, CaseIterable, Identifiable {
        case recipe, title
        var id: String { rawValue }
        var label: String {
            switch self {
            case .recipe: return "Recipe"
            case .title: return "Just a title"
            }
        }
    }

    init(
        mealPlanId: String,
        dateKey: String,
        existingSlot: MealSlot? = nil,
        defaultSlot: SlotType = .dinner,
        onAdded: @escaping () -> Void
    ) {
        self.mealPlanId = mealPlanId
        self.dateKey = dateKey
        self.existingSlot = existingSlot
        self.onAdded = onAdded
        _slot = State(initialValue: existingSlot?.slot ?? defaultSlot)
        _selectedRecipeId = State(initialValue: existingSlot?.recipeId)
        _customTitle = State(initialValue: existingSlot?.title ?? "")
        // If editing a title-only slot, start in title mode.
        let initialMode: Mode = (existingSlot?.recipeId == nil && existingSlot?.title != nil) ? .title : .recipe
        _mode = State(initialValue: initialMode)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Day") {
                    Text(formattedDate).foregroundStyle(.secondary)
                }

                Section("Meal") {
                    Picker("Slot", selection: $slot) {
                        ForEach(SlotType.allCases) { type in
                            Text(type.label).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                Section {
                    Picker("Mode", selection: $mode) {
                        ForEach(Mode.allCases) { m in
                            Text(m.label).tag(m)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                if mode == .title {
                    Section("Title") {
                        TextField("e.g. Pizza takeout", text: $customTitle)
                            .textInputAutocapitalization(.sentences)
                    }
                } else {
                    Section("Recipe") {
                        switch phase {
                        case .loading:
                            HStack { ProgressView(); Text("Loading recipes…") }
                        case .error(let msg):
                            Text(msg).foregroundStyle(.red)
                        case .loaded:
                            if recipes.isEmpty {
                                Text("No recipes yet. Add one first.")
                                    .foregroundStyle(.secondary)
                            } else {
                                ForEach(recipes) { recipe in
                                    Button {
                                        selectedRecipeId = recipe.id
                                    } label: {
                                        HStack {
                                            Text(recipe.title)
                                                .foregroundStyle(.primary)
                                            Spacer()
                                            if selectedRecipeId == recipe.id {
                                                Image(systemName: "checkmark")
                                                    .foregroundStyle(.tint)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(existingSlot == nil ? "Add to plan" : "Edit meal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if saving { ProgressView() } else { Text(existingSlot == nil ? "Add" : "Save") }
                    }
                    .disabled(!canSubmit || saving)
                }
            }
            .task { await loadRecipes() }
        }
    }

    private var canSubmit: Bool {
        switch mode {
        case .recipe: return selectedRecipeId != nil
        case .title: return !customTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }

    private var formattedDate: String {
        MealPlanDate.display(dateKey)
    }

    private func loadRecipes() async {
        do {
            let result: [Recipe] = try await APIClient.shared.send("GET", path: "/api/recipes")
            recipes = result.sorted { $0.title.localizedCompare($1.title) == .orderedAscending }
            phase = .loaded
        } catch {
            phase = .error(error.localizedDescription)
        }
    }

    private func save() async {
        guard canSubmit else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        let trimmedTitle = customTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        let recipeId = mode == .recipe ? selectedRecipeId : nil
        let title = mode == .title ? trimmedTitle : nil

        do {
            if let existingSlot {
                // PATCH: send both fields explicitly so a mode switch clears the previous one.
                let body = UpdateBody(
                    date: dateKey,
                    slot: slot.rawValue,
                    recipeId: recipeId,
                    title: title
                )
                _ = try await APIClient.shared.sendVoid(
                    "PATCH",
                    path: "/api/meal-plan/\(existingSlot.id)",
                    body: body
                )
            } else {
                // POST: include only the chosen field; the schema requires exactly one.
                let body = CreateBody(
                    mealPlanId: mealPlanId,
                    date: dateKey,
                    slot: slot.rawValue,
                    recipeId: recipeId,
                    title: title
                )
                _ = try await APIClient.shared.sendVoid("POST", path: "/api/meal-plan", body: body)
            }
            onAdded()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

/// POST body for `/api/meal-plan`. Omits nil keys (server schema requires exactly one of recipe_id / title).
private struct CreateBody: Encodable {
    let mealPlanId: String
    let date: String
    let slot: String
    let recipeId: String?
    let title: String?

    enum CodingKeys: String, CodingKey {
        case mealPlanId = "meal_plan_id"
        case date
        case slot
        case recipeId = "recipe_id"
        case title
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(mealPlanId, forKey: .mealPlanId)
        try c.encode(date, forKey: .date)
        try c.encode(slot, forKey: .slot)
        if let recipeId { try c.encode(recipeId, forKey: .recipeId) }
        if let title { try c.encode(title, forKey: .title) }
    }
}

/// PATCH body for `/api/meal-plan/[id]`. Always emits recipe_id and title — explicit null clears the field
/// server-side, which is what mode switches require.
private struct UpdateBody: Encodable {
    let date: String
    let slot: String
    let recipeId: String?
    let title: String?

    enum CodingKeys: String, CodingKey {
        case date
        case slot
        case recipeId = "recipe_id"
        case title
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(date, forKey: .date)
        try c.encode(slot, forKey: .slot)
        try c.encode(recipeId, forKey: .recipeId)
        try c.encode(title, forKey: .title)
    }
}
