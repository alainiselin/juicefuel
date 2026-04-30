import SwiftUI

struct PlannerView: View {
    @State private var slotsByDay: [Date: [MealSlot]] = [:]
    @State private var weekStart: Date = PlannerView.startOfWeek(for: Date())
    @State private var phase: Phase = .loading
    @State private var householdId: String?
    @State private var mealPlanId: String?
    @State private var addingFor: AddTarget?
    @State private var editingSlot: MealSlot?
    @State private var showingGenerator = false
    @State private var creatingPlan = false
    @State private var errorMessage: String?

    struct AddTarget: Identifiable {
        let date: Date
        var id: TimeInterval { date.timeIntervalSince1970 }
    }

    enum Phase {
        case loading
        case loaded
        case error(String)
        case noPlan
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Plan")
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button { shiftWeek(by: -1) } label: { Image(systemName: "chevron.left") }
                    }
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        if mealPlanId != nil {
                            Button {
                                showingGenerator = true
                            } label: {
                                Image(systemName: "wand.and.stars")
                            }
                        }
                        Button { shiftWeek(by: 1) } label: { Image(systemName: "chevron.right") }
                    }
                }
                .refreshable { await load() }
                .task { await load() }
                .sheet(item: $addingFor) { target in
                    if let mealPlanId {
                        AddMealSheet(mealPlanId: mealPlanId, date: target.date) {
                            Task { await load() }
                        }
                    }
                }
                .sheet(item: $editingSlot) { slot in
                    if let mealPlanId {
                        AddMealSheet(
                            mealPlanId: mealPlanId,
                            date: slot.date,
                            existingSlot: slot
                        ) {
                            Task { await load() }
                        }
                    }
                }
                .sheet(isPresented: $showingGenerator) {
                    if let mealPlanId {
                        MealPlanGeneratorSheet(mealPlanId: mealPlanId, startDate: weekStart) {
                            Task { await load() }
                        }
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .loading:
            BrandedLoadingView(title: "Loading planner", subtitle: "Checking this week's meals")
        case .noPlan:
            ContentUnavailableView {
                Label("No meal plan yet", systemImage: "calendar.badge.plus")
            } description: {
                Text("Create a meal plan for your active household and start planning on iPhone.")
            } actions: {
                Button {
                    Task { await createMealPlan() }
                } label: {
                    if creatingPlan { ProgressView() } else { Text("Create Meal Plan") }
                }
                .buttonStyle(.borderedProminent)
                .disabled(creatingPlan || householdId == nil)
            }
        case .error(let message):
            ContentUnavailableView(
                "Couldn't load plan",
                systemImage: "exclamationmark.triangle",
                description: Text(message)
            )
        case .loaded:
            VStack(spacing: 0) {
                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal)
                        .padding(.bottom, 8)
                }
                weekList
            }
        }
    }

    private var weekList: some View {
        List {
            Section {
                Text(weekTitle).font(.headline)
                    .listRowBackground(Color.clear)
            }
            ForEach(weekDays, id: \.self) { day in
                Section(header: Text(dayHeader(day))) {
                    daySlots(for: day)
                }
            }
        }
    }

    @ViewBuilder
    private func daySlots(for day: Date) -> some View {
        let dayKey = Calendar.current.startOfDay(for: day)
        let entries = slotsByDay[dayKey] ?? []
        ForEach(entries) { entry in
            entryRow(entry: entry)
                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                    Button(role: .destructive) {
                        Task { await removeSlot(id: entry.id, dayKey: dayKey) }
                    } label: {
                        Label("Remove", systemImage: "trash")
                    }
                    Button {
                        editingSlot = entry
                    } label: {
                        Label("Edit", systemImage: "slider.horizontal.3")
                    }
                    .tint(.blue)
                }
        }
        Button {
            addingFor = AddTarget(date: day)
        } label: {
            Label(entries.isEmpty ? "Plan a meal" : "Add another", systemImage: "plus")
        }
        .foregroundStyle(.tint)
    }

    @ViewBuilder
    private func entryRow(entry: MealSlot) -> some View {
        if let recipe = entry.recipe {
            NavigationLink(value: recipe) {
                slotRow(slot: entry.slot, recipe: recipe)
            }
        } else {
            slotRow(slot: entry.slot, recipe: nil)
        }
    }

    private func slotRow(slot: SlotType, recipe: Recipe?) -> some View {
        HStack(spacing: 12) {
            Image(systemName: slot.symbol)
                .foregroundStyle(.tint)
                .frame(width: 24)
            VStack(alignment: .leading, spacing: 2) {
                Text(slot.label)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Text(recipe?.title ?? "—")
                    .font(.body)
            }
        }
    }

    // MARK: - Data

    private func load() async {
        phase = .loading
        do {
            let active: ActiveHouseholdResponse = try await APIClient.shared.send("GET", path: "/api/households/me")
            householdId = active.household.id
            let households: [HouseholdSummary] = try await APIClient.shared.send("GET", path: "/api/households")
            let household = households.first(where: { $0.id == active.household.id }) ?? households.first
            guard let plan = household?.mealPlan else {
                mealPlanId = nil
                slotsByDay = [:]
                phase = .noPlan
                return
            }
            mealPlanId = plan.id
            let weekEnd = Calendar.current.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
            let from = ymd(weekStart)
            let to = ymd(weekEnd)
            let slots: [MealSlot] = try await APIClient.shared.send(
                "GET",
                path: "/api/meal-plan?meal_plan_id=\(plan.id)&from=\(from)&to=\(to)"
            )
            slotsByDay = Dictionary(grouping: slots) { Calendar.current.startOfDay(for: $0.date) }
            errorMessage = nil
            phase = .loaded
        } catch {
            phase = .error(error.localizedDescription)
        }
    }

    private func createMealPlan() async {
        guard let householdId else { return }
        struct Body: Encodable { let household_id: String }

        creatingPlan = true
        errorMessage = nil
        defer { creatingPlan = false }
        do {
            let plan: MealPlanRef = try await APIClient.shared.send(
                "POST",
                path: "/api/households/meal-plan",
                body: Body(household_id: householdId)
            )
            mealPlanId = plan.id
            phase = .loaded
            await load()
        } catch {
            errorMessage = error.localizedDescription
            phase = .noPlan
        }
    }

    private func removeSlot(id: String, dayKey: Date) async {
        // Optimistic remove.
        let previous = slotsByDay[dayKey] ?? []
        slotsByDay[dayKey] = previous.filter { $0.id != id }
        do {
            _ = try await APIClient.shared.sendVoid("DELETE", path: "/api/meal-plan/\(id)")
        } catch {
            // Revert on failure.
            slotsByDay[dayKey] = previous
        }
    }

    private func shiftWeek(by weeks: Int) {
        guard let new = Calendar.current.date(byAdding: .weekOfYear, value: weeks, to: weekStart) else { return }
        weekStart = new
        Task { await load() }
    }

    // MARK: - Date helpers

    private static func startOfWeek(for date: Date) -> Date {
        var calendar = Calendar.current
        calendar.firstWeekday = 2 // Monday
        let comps = calendar.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return calendar.date(from: comps) ?? date
    }

    private var weekDays: [Date] {
        (0..<7).compactMap { Calendar.current.date(byAdding: .day, value: $0, to: weekStart) }
    }

    private var weekTitle: String {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        let end = Calendar.current.date(byAdding: .day, value: 6, to: weekStart) ?? weekStart
        return "\(f.string(from: weekStart)) – \(f.string(from: end))"
    }

    private func dayHeader(_ d: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMM d"
        return f.string(from: d)
    }

    private func ymd(_ d: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: d)
    }
}

private struct MealPlanGeneratorSheet: View {
    let mealPlanId: String
    let startDate: Date
    var onApplied: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var days = 7.0
    @State private var mealTypes: Set<SlotType> = [.breakfast, .lunch, .dinner]
    @State private var diet = Diet.none
    @State private var favoriteRatio = 30.0
    @State private var avoidSameRecipe = true
    @State private var generated: MealPlanGenerationResult?
    @State private var recipesById: [String: Recipe] = [:]
    @State private var loading = false
    @State private var errorMessage: String?

    enum Diet: String, CaseIterable, Identifiable {
        case none
        case vegetarian
        case vegan

        var id: String { rawValue }
        var label: String { rawValue.capitalized }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Range") {
                    Stepper("Days: \(Int(days))", value: $days, in: 1...14, step: 1)
                    mealTypeToggle(.breakfast)
                    mealTypeToggle(.lunch)
                    mealTypeToggle(.dinner)
                }

                Section("Preferences") {
                    Picker("Diet", selection: $diet) {
                        ForEach(Diet.allCases) { diet in
                            Text(diet.label).tag(diet)
                        }
                    }
                    Slider(value: $favoriteRatio, in: 0...100, step: 10) {
                        Text("Favorites")
                    } minimumValueLabel: {
                        Text("0%")
                    } maximumValueLabel: {
                        Text("100%")
                    }
                    Text("Mix in favorites: \(Int(favoriteRatio))%")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Toggle("Avoid repeating recipes", isOn: $avoidSameRecipe)
                }

                if let generated {
                    Section("Preview") {
                        Text("\(generated.suggestion.count) meals. Empty slots only will be filled.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        ForEach(generated.suggestion) { slot in
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(recipesById[slot.recipeId]?.title ?? "Recipe")
                                        .font(.body.weight(.medium))
                                    Text("\(slot.date) · \(slot.mealType.label)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                            }
                        }
                    }

                    if !generated.relaxedConstraints.isEmpty {
                        Section("Relaxed") {
                            Text(generated.relaxedConstraints.joined(separator: ", "))
                                .foregroundStyle(.secondary)
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
            .navigationTitle("Generate Plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if generated == nil {
                        Button {
                            Task { await generate() }
                        } label: {
                            if loading { ProgressView() } else { Text("Roll") }
                        }
                        .disabled(loading || mealTypes.isEmpty)
                    } else {
                        Button {
                            Task { await apply() }
                        } label: {
                            if loading { ProgressView() } else { Text("Apply") }
                        }
                        .disabled(loading)
                    }
                }
                ToolbarItem(placement: .bottomBar) {
                    if generated != nil {
                        Button("Reroll") {
                            Task { await generate() }
                        }
                        .disabled(loading)
                    }
                }
            }
            .task { await loadRecipes() }
        }
    }

    private func mealTypeToggle(_ type: SlotType) -> some View {
        Toggle(type.label, isOn: Binding(
            get: { mealTypes.contains(type) },
            set: { isOn in
                if isOn {
                    mealTypes.insert(type)
                } else if mealTypes.count > 1 {
                    mealTypes.remove(type)
                }
            }
        ))
    }

    private func loadRecipes() async {
        do {
            let recipes: [Recipe] = try await APIClient.shared.send("GET", path: "/api/recipes")
            recipesById = Dictionary(uniqueKeysWithValues: recipes.map { ($0.id, $0) })
        } catch {
            // Preview names are optional; generation can still run.
        }
    }

    private func generate() async {
        struct Body: Encodable {
            let days: Int
            let mealTypes: [SlotType]
            let diet: String
            let favoriteRatio: Int
            let proteinFilters: [String]
            let effort: String
            let libraryIds: [String]
            let avoidSameRecipe: Bool
            let avoidBackToBackCuisine: Bool
            let avoidBackToBackProtein: Bool
            let seed: Int
        }

        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            var result: MealPlanGenerationResult = try await APIClient.shared.send(
                "POST",
                path: "/api/meal-plan/generate",
                body: Body(
                    days: Int(days),
                    mealTypes: [.breakfast, .lunch, .dinner].filter { mealTypes.contains($0) },
                    diet: diet.rawValue,
                    favoriteRatio: Int(favoriteRatio),
                    proteinFilters: [],
                    effort: "any",
                    libraryIds: [],
                    avoidSameRecipe: avoidSameRecipe,
                    avoidBackToBackCuisine: false,
                    avoidBackToBackProtein: false,
                    seed: Int(Date().timeIntervalSince1970)
                )
            )
            let orderedTypes = [.breakfast, .lunch, .dinner].filter { mealTypes.contains($0) }
            result.suggestion = result.suggestion.enumerated().map { index, slot in
                let dayOffset = orderedTypes.isEmpty ? 0 : index / orderedTypes.count
                let date = Calendar.current.date(byAdding: .day, value: dayOffset, to: startDate) ?? startDate
                return MealPlanGeneratedSlot(date: ymd(date), mealType: slot.mealType, recipeId: slot.recipeId)
            }
            generated = result
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func apply() async {
        guard let generated else { return }
        struct Body: Encodable {
            let mealPlanId: String
            let slots: [MealPlanGeneratedSlot]
        }

        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            _ = try await APIClient.shared.sendVoid(
                "POST",
                path: "/api/meal-plan/apply",
                body: Body(mealPlanId: mealPlanId, slots: generated.suggestion)
            )
            onApplied()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func ymd(_ d: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: d)
    }
}

#Preview {
    PlannerView()
}
