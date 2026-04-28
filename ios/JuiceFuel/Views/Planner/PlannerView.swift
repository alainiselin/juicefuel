import SwiftUI

struct PlannerView: View {
    @State private var slotsByDay: [Date: [MealSlot]] = [:]
    @State private var weekStart: Date = PlannerView.startOfWeek(for: Date())
    @State private var phase: Phase = .loading
    @State private var mealPlanId: String?
    @State private var addingFor: AddTarget?

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
                    ToolbarItem(placement: .topBarTrailing) {
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
        }
    }

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .loading:
            ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
        case .noPlan:
            ContentUnavailableView(
                "No meal plan yet",
                systemImage: "calendar.badge.plus",
                description: Text("Create a meal plan in the web app — it will sync here.")
            )
        case .error(let message):
            ContentUnavailableView(
                "Couldn't load plan",
                systemImage: "exclamationmark.triangle",
                description: Text(message)
            )
        case .loaded:
            weekList
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
            let households: [HouseholdSummary] = try await APIClient.shared.send("GET", path: "/api/households")
            guard let plan = households.first?.mealPlan else {
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
            phase = .loaded
        } catch {
            phase = .error(error.localizedDescription)
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

#Preview {
    PlannerView()
}
