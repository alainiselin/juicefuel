import SwiftUI

struct AddMealSheet: View {
    let mealPlanId: String
    let date: Date

    var onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var slot: SlotType = .dinner
    @State private var recipes: [Recipe] = []
    @State private var selectedRecipeId: String?
    @State private var phase: Phase = .loading
    @State private var errorMessage: String?
    @State private var saving = false

    enum Phase { case loading, loaded, error(String) }

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
            .navigationTitle("Add to plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if saving { ProgressView() } else { Text("Add") }
                    }
                    .disabled(selectedRecipeId == nil || saving)
                }
            }
            .task { await loadRecipes() }
        }
    }

    private var formattedDate: String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: date)
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

        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        let dateString = f.string(from: date)

        do {
            _ = try await APIClient.shared.sendVoid(
                "POST",
                path: "/api/meal-plan",
                body: [
                    "meal_plan_id": mealPlanId,
                    "date": dateString,
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
