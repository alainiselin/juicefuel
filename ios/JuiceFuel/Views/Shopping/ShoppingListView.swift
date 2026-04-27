import SwiftUI

struct ShoppingListView: View {
    @State private var lists: [ShoppingList] = []
    @State private var phase: Phase = .loading

    enum Phase {
        case loading, loaded, empty, error(String)
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Shopping")
                .refreshable { await load() }
                .task { await load() }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .loading:
            ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
        case .empty:
            ContentUnavailableView(
                "No shopping lists",
                systemImage: "cart",
                description: Text("Generate a shopping list from the planner in the web app.")
            )
        case .error(let message):
            ContentUnavailableView(
                "Couldn't load lists",
                systemImage: "exclamationmark.triangle",
                description: Text(message)
            )
        case .loaded:
            list
        }
    }

    private var list: some View {
        List {
            ForEach(lists) { list in
                NavigationLink(value: list) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(list.title).font(.body.weight(.medium))
                        HStack {
                            Text(list.status.rawValue.capitalized).font(.caption).foregroundStyle(.secondary)
                            Spacer()
                            Text("\(list.items.count) items").font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationDestination(for: ShoppingList.self) { ShoppingListDetailView(list: $0) }
    }

    private func load() async {
        do {
            let result: [ShoppingList] = try await APIClient.shared.send("GET", path: "/api/shopping-list")
            lists = result
            phase = result.isEmpty ? .empty : .loaded
        } catch {
            phase = .error(error.localizedDescription)
        }
    }
}

private struct ShoppingListDetailView: View {
    let list: ShoppingList

    var body: some View {
        List {
            ForEach(grouped, id: \.0) { (aisle, items) in
                Section(header: Text(aisle)) {
                    ForEach(items) { item in
                        itemRow(item)
                    }
                }
            }
        }
        .navigationTitle(list.title)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func itemRow(_ item: ShoppingListItem) -> some View {
        HStack {
            Image(systemName: item.isChecked ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(item.isChecked ? Color.green : Color.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(item.displayName)
                    .strikethrough(item.isChecked)
                    .foregroundStyle(item.isChecked ? .secondary : .primary)
                if let amount = formattedAmount(item) {
                    Text(amount).font(.caption).foregroundStyle(.secondary)
                }
            }
        }
    }

    private func formattedAmount(_ item: ShoppingListItem) -> String? {
        guard let q = item.quantity else { return nil }
        let n = NumberFormatter.localizedString(from: NSNumber(value: q), number: .decimal)
        if let unit = item.unit { return "\(n) \(unit.lowercased())" }
        return n
    }

    private var grouped: [(String, [ShoppingListItem])] {
        let groups = Dictionary(grouping: list.items) { item -> String in
            item.tags?.first(where: { $0.kind == "AISLE" })?.label ?? "Other"
        }
        return groups
            .sorted { $0.key.localizedCompare($1.key) == .orderedAscending }
    }
}

#Preview {
    ShoppingListView()
}
