import SwiftUI

struct AddMealSheet: View {
    let mealPlanId: String
    let dateKey: String
    let existingSlot: MealSlot?

    var onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var slot: SlotType
    @State private var recipes: [Recipe] = []
    @State private var selectedRecipeId: String?
    @State private var phase: Phase = .loading
    @State private var errorMessage: String?
    @State private var saving = false

    enum Phase { case loading, loaded, error(String) }

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
                    .disabled(selectedRecipeId == nil || saving)
                }
            }
            .task { await loadRecipes() }
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
        guard let recipeId = selectedRecipeId else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        do {
            let path = existingSlot.map { "/api/meal-plan/\($0.id)" } ?? "/api/meal-plan"
            let method = existingSlot == nil ? "POST" : "PATCH"
            _ = try await APIClient.shared.sendVoid(
                method,
                path: path,
                body: [
                    "meal_plan_id": mealPlanId,
                    "date": dateKey,
                    "slot": slot.rawValue,
                    "recipe_id": recipeId,
                ]
            )
            onAdded()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
