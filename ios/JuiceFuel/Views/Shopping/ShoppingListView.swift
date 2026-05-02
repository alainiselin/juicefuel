import SwiftUI

struct ShoppingListView: View {
    @State private var lists: [ShoppingList] = []
    @State private var phase: Phase = .loading
    @State private var showingCreateList = false
    @State private var showingGenerator = false

    enum Phase {
        case loading, loaded, empty, error(String)
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Shopping")
                .refreshable { await load() }
                .task { await load() }
                .toolbar {
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        if !lists.isEmpty {
                            Button {
                                showingGenerator = true
                            } label: {
                                Image(systemName: "wand.and.stars")
                            }
                        }
                        Button {
                            showingCreateList = true
                        } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
                .sheet(isPresented: $showingCreateList) {
                    CreateShoppingListSheet { list in
                        lists.insert(list, at: 0)
                        phase = .loaded
                    }
                }
                .sheet(isPresented: $showingGenerator) {
                    GenerateShoppingListSheet(currentListId: lists.first?.id ?? "") { updated in
                        if let index = lists.firstIndex(where: { $0.id == updated.id }) {
                            lists[index] = updated
                        }
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch phase {
        case .loading:
            BrandedLoadingView(title: "Loading shopping", subtitle: "Gathering your active lists")
        case .empty:
            ContentUnavailableView {
                Label("No shopping lists", systemImage: "cart")
            } description: {
                Text("Create a list here, then add grocery and household items as you shop.")
            } actions: {
                Button("Create List") {
                    showingCreateList = true
                }
                .buttonStyle(.borderedProminent)
            }
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
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    Button {
                        Task { await updateList(list, status: .completed) }
                    } label: {
                        Label("Finish", systemImage: "checkmark.circle")
                    }
                    .tint(.green)
                }
            }
        }
        .navigationDestination(for: ShoppingList.self) { list in
            ShoppingListDetailView(list: list) { updated in
                if let index = lists.firstIndex(where: { $0.id == updated.id }) {
                    lists[index] = updated
                }
            }
        }
    }

    private func load() async {
        do {
            let result: [ShoppingList] = try await APIClient.shared.send("GET", path: "/api/shopping-list")
            lists = result.filter { $0.status == .active }
            phase = result.isEmpty ? .empty : .loaded
        } catch {
            phase = .error(error.localizedDescription)
        }
    }

    private func updateList(_ list: ShoppingList, status: ShoppingListStatus) async {
        struct Body: Encodable { let status: ShoppingListStatus }
        do {
            let updated: ShoppingList = try await APIClient.shared.send(
                "PATCH",
                path: "/api/shopping-list/\(list.id)",
                body: Body(status: status)
            )
            if status == .completed {
                lists.removeAll { $0.id == updated.id }
                phase = lists.isEmpty ? .empty : .loaded
            } else if let index = lists.firstIndex(where: { $0.id == updated.id }) {
                lists[index] = updated
            }
        } catch {
            // Keep the existing list visible; detail screens surface richer errors.
        }
    }
}

private struct ShoppingListDetailView: View {
    @State var list: ShoppingList
    var onChange: (ShoppingList) -> Void = { _ in }

    @State private var errorMessage: String?
    @State private var showingAddItem = false
    @State private var editingItem: ShoppingListItem?
    @State private var showingGenerator = false
    @State private var confirmFinishShopping = false

    // 3 equal-width columns on the iPhone width — paired with a 1:1 aspect ratio on
    // each card for a tidy square grid like the web mobile layout.
    private let cardColumns = Array(repeating: GridItem(.flexible(), spacing: 10), count: 3)

    var body: some View {
        Group {
            if list.items.isEmpty {
                ContentUnavailableView {
                    Label("No items", systemImage: "cart.badge.plus")
                } description: {
                    Text("Add ingredients or custom household items to this list.")
                } actions: {
                    Button("Add Item") { showingAddItem = true }
                        .buttonStyle(.borderedProminent)
                }
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 20) {
                        if let errorMessage {
                            Text(errorMessage)
                                .font(.footnote)
                                .foregroundStyle(.red)
                                .padding(.horizontal)
                        }

                        // Active rubric sections (only those that have unchecked items).
                        ForEach(activeRubrics, id: \.id) { rubric in
                            sectionView(
                                title: rubric.name,
                                count: itemsByRubric[rubric.id]?.count ?? 0,
                                items: itemsByRubric[rubric.id] ?? []
                            )
                        }

                        // Checked items go to the bottom in their own collapsible section.
                        if !checkedItems.isEmpty {
                            sectionView(
                                title: "Checked Items",
                                count: checkedItems.count,
                                items: checkedItems
                            )
                        }
                    }
                    .padding(.vertical)
                }
                .refreshable { await reload() }
            }
        }
        .navigationTitle(list.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                if !checkedItems.isEmpty {
                    Button {
                        confirmFinishShopping = true
                    } label: {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                    .accessibilityLabel("Shopping finished")
                }
                Button {
                    showingGenerator = true
                } label: {
                    Image(systemName: "wand.and.stars")
                }
                Button {
                    showingAddItem = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .confirmationDialog(
            "Remove \(checkedItems.count) checked item\(checkedItems.count == 1 ? "" : "s")?",
            isPresented: $confirmFinishShopping,
            titleVisibility: .visible
        ) {
            Button("Shopping finished", role: .destructive) {
                Task { await clearCheckedItems() }
            }
            Button("Cancel", role: .cancel) {}
        }
        .sheet(isPresented: $showingAddItem) {
            AddShoppingItemSheet(list: $list) {
                onChange(list)
            }
        }
        .sheet(item: $editingItem) { item in
            EditShoppingItemSheet(item: item, currentListTitle: list.title) { updated in
                if updated.shoppingListId == list.id {
                    replace(updated)
                } else {
                    list.items.removeAll { $0.id == updated.id }
                }
                onChange(list)
            }
        }
        .sheet(isPresented: $showingGenerator) {
            GenerateShoppingListSheet(currentListId: list.id) { updatedList in
                if updatedList.id == list.id {
                    list = updatedList
                    onChange(updatedList)
                } else {
                    Task { await reload() }
                }
            }
        }
    }

    @ViewBuilder
    private func sectionView(title: String, count: Int, items: [ShoppingListItem]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(title)
                    .font(.headline)
                Text("\(count)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding(.horizontal)

            LazyVGrid(columns: cardColumns, spacing: 10) {
                ForEach(items) { item in
                    ShoppingItemCard(item: item)
                        .onTapGesture { toggle(item) }
                        .contextMenu {
                            Button {
                                editingItem = item
                            } label: {
                                Label("Edit", systemImage: "slider.horizontal.3")
                            }
                            Button(role: .destructive) {
                                Task { await delete(item) }
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Derived state

    /// Unchecked items grouped by rubric id, preserving the fixed rubric order.
    private var itemsByRubric: [String: [ShoppingListItem]] {
        var buckets: [String: [ShoppingListItem]] = [:]
        for item in list.items where !item.isChecked {
            let id = ShoppingRubrics.rubric(for: item).id
            buckets[id, default: []].append(item)
        }
        return buckets
    }

    private var activeRubrics: [ShoppingRubric] {
        ShoppingRubrics.all.filter { (itemsByRubric[$0.id]?.isEmpty == false) }
    }

    private var checkedItems: [ShoppingListItem] {
        list.items.filter { $0.isChecked }
    }

    // MARK: - Networking

    private func reload() async {
        do {
            let fresh: ShoppingList = try await APIClient.shared.send(
                "GET",
                path: "/api/shopping-list/\(list.id)"
            )
            list = fresh
            errorMessage = nil
            onChange(fresh)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func toggle(_ item: ShoppingListItem) {
        guard let idx = list.items.firstIndex(where: { $0.id == item.id }) else { return }
        let previous = list.items[idx].isChecked
        list.items[idx].isChecked.toggle()
        let newValue = list.items[idx].isChecked
        let id = item.id

        Task {
            do {
                _ = try await APIClient.shared.sendVoid(
                    "PATCH",
                    path: "/api/shopping-list-items/\(id)",
                    body: ["is_checked": newValue]
                )
                onChange(list)
            } catch {
                if let i = list.items.firstIndex(where: { $0.id == id }) {
                    list.items[i].isChecked = previous
                }
                errorMessage = "Couldn't sync — \(error.localizedDescription)"
            }
        }
    }

    private func delete(_ item: ShoppingListItem) async {
        let previous = list.items
        list.items.removeAll { $0.id == item.id }
        do {
            _ = try await APIClient.shared.sendVoid("DELETE", path: "/api/shopping-list-items/\(item.id)")
            onChange(list)
        } catch {
            list.items = previous
            errorMessage = "Couldn't delete — \(error.localizedDescription)"
        }
    }

    private func replace(_ item: ShoppingListItem) {
        if let index = list.items.firstIndex(where: { $0.id == item.id }) {
            list.items[index] = item
        }
    }

    private func clearCheckedItems() async {
        let toRemove = checkedItems
        guard !toRemove.isEmpty else { return }

        let previous = list.items
        list.items.removeAll { $0.isChecked }

        // Delete in parallel; revert all on any failure.
        do {
            try await withThrowingTaskGroup(of: Void.self) { group in
                for item in toRemove {
                    group.addTask {
                        _ = try await APIClient.shared.sendVoid(
                            "DELETE",
                            path: "/api/shopping-list-items/\(item.id)"
                        )
                    }
                }
                try await group.waitForAll()
            }
            onChange(list)
        } catch {
            list.items = previous
            errorMessage = "Couldn't clear all — \(error.localizedDescription)"
        }
    }
}

/// Card view for a single shopping item — name + amount, dimmed/strikethrough when checked.
///
/// Layout note: a `Color.clear.aspectRatio(1, .fit)` is the canonical SwiftUI trick to make a
/// LazyVGrid cell square. Content sits in an overlay on top, so its intrinsic height never
/// affects the slot size — every card is exactly column-width × column-width.
private struct ShoppingItemCard: View {
    let item: ShoppingListItem

    var body: some View {
        Color.clear
            .aspectRatio(1, contentMode: .fit)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(Color(.secondarySystemBackground))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(Color(.separator).opacity(0.5), lineWidth: 0.5)
            )
            .overlay(alignment: .topLeading) {
                content
                    .padding(10)
            }
            .opacity(item.isChecked ? 0.55 : 1)
            .contentShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(item.displayName)
                .font(.subheadline.weight(.semibold))
                .strikethrough(item.isChecked)
                .foregroundStyle(item.isChecked ? .secondary : .primary)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
                .multilineTextAlignment(.leading)
                .frame(maxWidth: .infinity, alignment: .leading)

            Spacer(minLength: 0)

            if let amount {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(amount.value)
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(item.isChecked ? Color.secondary : Color.accentColor)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    if !amount.unit.isEmpty {
                        Text(amount.unit)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var amount: (value: String, unit: String)? {
        let q = ShoppingFormat.quantity(item.quantity)
        let u = ShoppingFormat.unit(item.unit)
        if q.isEmpty && u.isEmpty { return nil }
        return (q, u)
    }
}

private struct CreateShoppingListSheet: View {
    var onCreated: (ShoppingList) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var title = defaultTitle
    @State private var storeHint = ""
    @State private var saving = false
    @State private var errorMessage: String?

    private static var defaultTitle: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return "Shopping \(formatter.string(from: Date()))"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("List") {
                    TextField("Title", text: $title)
                    TextField("Store hint", text: $storeHint)
                }
                if let errorMessage {
                    Section { Text(errorMessage).font(.footnote).foregroundStyle(.red) }
                }
            }
            .navigationTitle("New List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await create() }
                    } label: {
                        if saving { ProgressView() } else { Text("Create") }
                    }
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                }
            }
        }
    }

    private func create() async {
        struct Body: Encodable {
            let title: String
            let status: ShoppingListStatus
            let store_hint: String?
        }

        saving = true
        errorMessage = nil
        defer { saving = false }
        do {
            let list: ShoppingList = try await APIClient.shared.send(
                "POST",
                path: "/api/shopping-list",
                body: Body(
                    title: title.trimmingCharacters(in: .whitespacesAndNewlines),
                    status: .active,
                    store_hint: storeHint.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : storeHint
                )
            )
            onCreated(list)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct AddShoppingItemSheet: View {
    @Binding var list: ShoppingList
    var onChanged: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [ShoppingSearchItem] = []
    @State private var searching = false
    @State private var savingItemId: String?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TextField("Search ingredients or items", text: $query)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onSubmit { Task { await search() } }
                        .onChange(of: query) { _, newValue in
                            if newValue.count < 2 { results = [] }
                            Task { await searchIfUseful(newValue) }
                        }
                }

                if searching {
                    HStack { ProgressView(); Text("Searching...") }
                }

                if !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Button {
                        Task { await createCustomItem() }
                    } label: {
                        Label("Create \"\(query.trimmingCharacters(in: .whitespacesAndNewlines))\"", systemImage: "plus.circle")
                    }
                }

                ForEach(results) { item in
                    Button {
                        Task { await add(item) }
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 3) {
                                Text(item.name.capitalized)
                                    .foregroundStyle(.primary)
                                Text(item.type == .ingredient ? "Ingredient" : "Custom item")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if savingItemId == item.id {
                                ProgressView()
                            } else {
                                Image(systemName: "plus")
                                    .foregroundStyle(.tint)
                            }
                        }
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .navigationTitle("Add Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    private func searchIfUseful(_ value: String) async {
        guard value.count >= 2 else { return }
        try? await Task.sleep(nanoseconds: 250_000_000)
        guard value == query else { return }
        await search()
    }

    private func search() async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else { return }
        searching = true
        errorMessage = nil
        defer { searching = false }
        do {
            let escaped = trimmed.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? trimmed
            results = try await APIClient.shared.send(
                "GET",
                path: "/api/shopping/items/search?query=\(escaped)&limit=20"
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func createCustomItem() async {
        struct Body: Encodable { let name: String }
        let name = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        savingItemId = "custom"
        defer { savingItemId = nil }
        do {
            let article: ShoppingArticle = try await APIClient.shared.send(
                "POST",
                path: "/api/shopping/articles",
                body: Body(name: name)
            )
            await add(ShoppingSearchItem(
                type: .article,
                id: article.id,
                name: article.name,
                defaultUnit: article.defaultUnit,
                aisle: article.defaultAisle
            ))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func add(_ item: ShoppingSearchItem) async {
        savingItemId = item.id
        errorMessage = nil
        defer { savingItemId = nil }

        if let existing = list.items.first(where: {
            item.type == .article ? $0.articleId == item.id : $0.ingredientId == item.id
        }) {
            await updateExisting(existing)
            return
        }

        struct Body: Encodable {
            let ingredient_id: String?
            let article_id: String?
            let quantity: Double
            let unit: String?
        }

        do {
            let created: ShoppingListItem = try await APIClient.shared.send(
                "POST",
                path: "/api/shopping-list/\(list.id)/items",
                body: Body(
                    ingredient_id: item.type == .ingredient ? item.id : nil,
                    article_id: item.type == .article ? item.id : nil,
                    quantity: 1,
                    unit: item.defaultUnit
                )
            )
            list.items.append(created)
            onChanged()
            query = ""
            results = []
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func updateExisting(_ item: ShoppingListItem) async {
        struct Body: Encodable { let quantity: Double }
        do {
            let updated: ShoppingListItem = try await APIClient.shared.send(
                "PATCH",
                path: "/api/shopping-list-items/\(item.id)",
                body: Body(quantity: (item.quantity ?? 1) + 1)
            )
            if let index = list.items.firstIndex(where: { $0.id == updated.id }) {
                list.items[index] = updated
            }
            onChanged()
            query = ""
            results = []
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct EditShoppingItemSheet: View {
    let item: ShoppingListItem
    let currentListTitle: String
    var onSaved: (ShoppingListItem) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var quantity: String
    @State private var unit: String
    @State private var note: String
    @State private var lists: [ShoppingList] = []
    @State private var selectedListId: String
    @State private var selectedAisle: String
    @State private var loadingLists = false
    @State private var saving = false
    @State private var errorMessage: String?

    init(item: ShoppingListItem, currentListTitle: String, onSaved: @escaping (ShoppingListItem) -> Void) {
        self.item = item
        self.currentListTitle = currentListTitle
        self.onSaved = onSaved
        _quantity = State(initialValue: item.quantity.map { String(format: "%g", $0) } ?? "")
        _unit = State(initialValue: item.unit ?? "")
        _note = State(initialValue: item.note ?? "")
        _selectedListId = State(initialValue: item.shoppingListId)
        _selectedAisle = State(initialValue: ShoppingRubrics.rubric(for: item).id)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Location") {
                    Picker("List", selection: $selectedListId) {
                        if lists.isEmpty {
                            Text(currentListTitle).tag(item.shoppingListId)
                        } else {
                            ForEach(lists) { list in
                                Text(list.title).tag(list.id)
                            }
                        }
                    }
                    .disabled(loadingLists || lists.isEmpty)

                    Picker("Category", selection: $selectedAisle) {
                        ForEach(ShoppingRubrics.all) { rubric in
                            Text(rubric.name).tag(rubric.id)
                        }
                    }

                    if loadingLists {
                        HStack {
                            ProgressView()
                            Text("Loading lists...")
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section(item.displayName.capitalized) {
                    TextField("Quantity", text: $quantity)
                        .keyboardType(.decimalPad)
                    TextField("Unit", text: $unit)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                    TextField("Note", text: $note, axis: .vertical)
                }
                if let errorMessage {
                    Section { Text(errorMessage).font(.footnote).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Edit Item")
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
                }
            }
            .task { await loadLists() }
        }
    }

    private func loadLists() async {
        guard lists.isEmpty else { return }
        loadingLists = true
        defer { loadingLists = false }
        do {
            let result: [ShoppingList] = try await APIClient.shared.send("GET", path: "/api/shopping-list")
            lists = result.filter { $0.status == .active }
            if !lists.contains(where: { $0.id == selectedListId }) {
                lists.insert(ShoppingList(
                    id: item.shoppingListId,
                    householdId: "",
                    title: currentListTitle,
                    status: .active,
                    storeHint: nil,
                    items: []
                ), at: 0)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() async {
        struct Body: Encodable {
            let shoppingListId: String
            let quantity: Double?
            let unit: String?
            let note: String?
            let aisle: String

            enum CodingKeys: String, CodingKey {
                case shoppingListId = "shopping_list_id"
                case quantity
                case unit
                case note
                case aisle
            }
        }

        let trimmedQuantity = quantity.trimmingCharacters(in: .whitespacesAndNewlines)
        let parsedQuantity = trimmedQuantity.isEmpty ? nil : Double(trimmedQuantity.replacingOccurrences(of: ",", with: "."))
        if !trimmedQuantity.isEmpty, parsedQuantity == nil {
            errorMessage = "Quantity must be a number."
            return
        }

        saving = true
        errorMessage = nil
        defer { saving = false }
        do {
            let updated: ShoppingListItem = try await APIClient.shared.send(
                "PATCH",
                path: "/api/shopping-list-items/\(item.id)",
                body: Body(
                    shoppingListId: selectedListId,
                    quantity: parsedQuantity,
                    unit: unit.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : unit.uppercased(),
                    note: note.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : note,
                    aisle: selectedAisle
                )
            )
            onSaved(updated)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct GenerateShoppingListSheet: View {
    let currentListId: String
    var onCompleted: (ShoppingList) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var lists: [ShoppingList] = []
    @State private var targetListId: String
    @State private var mealPlanId: String?
    @State private var days: Int = 7
    @State private var loading = true
    @State private var generating = false
    @State private var errorMessage: String?
    @State private var resultMessage: String?

    init(currentListId: String, onCompleted: @escaping (ShoppingList) -> Void) {
        self.currentListId = currentListId
        self.onCompleted = onCompleted
        _targetListId = State(initialValue: currentListId)
    }

    var body: some View {
        NavigationStack {
            Form {
                if loading {
                    HStack { ProgressView(); Text("Loading…") }
                } else if mealPlanId == nil {
                    Section {
                        Text("Create a meal plan first to generate a shopping list.")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Section("Add to list") {
                        Picker("List", selection: $targetListId) {
                            ForEach(lists) { list in
                                Text(list.title).tag(list.id)
                            }
                        }
                    }

                    Section {
                        Stepper(value: $days, in: 1...14) {
                            Text("\(days) day\(days == 1 ? "" : "s") ahead")
                        }
                        Text("From \(formatted(fromDate)) to \(formatted(toDate))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } header: {
                        Text("Period")
                    }
                }

                if let resultMessage {
                    Section { Text(resultMessage).font(.footnote).foregroundStyle(.green) }
                }
                if let errorMessage {
                    Section { Text(errorMessage).font(.footnote).foregroundStyle(.red) }
                }
            }
            .navigationTitle("Generate List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await generate() }
                    } label: {
                        if generating { ProgressView() } else { Text("Generate") }
                    }
                    .disabled(loading || generating || mealPlanId == nil || targetListId.isEmpty)
                }
            }
            .task { await loadContext() }
        }
    }

    private var fromDate: Date {
        Calendar.current.startOfDay(for: Date())
    }

    private var toDate: Date {
        Calendar.current.date(byAdding: .day, value: days - 1, to: fromDate) ?? fromDate
    }

    private func formatted(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        return f.string(from: date)
    }

    private func ymd(_ date: Date) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }

    private func loadContext() async {
        loading = true
        defer { loading = false }
        do {
            async let listsTask: [ShoppingList] = APIClient.shared.send("GET", path: "/api/shopping-list")
            async let active: ActiveHouseholdResponse = APIClient.shared.send("GET", path: "/api/households/me")
            async let households: [HouseholdSummary] = APIClient.shared.send("GET", path: "/api/households")

            let (loadedLists, activeHousehold, allHouseholds) = try await (listsTask, active, households)
            lists = loadedLists.filter { $0.status == .active }
            if !lists.contains(where: { $0.id == targetListId }), let first = lists.first {
                targetListId = first.id
            }
            let household = allHouseholds.first(where: { $0.id == activeHousehold.household.id }) ?? allHouseholds.first
            mealPlanId = household?.mealPlan?.id
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func generate() async {
        guard let mealPlanId else { return }
        struct Body: Encodable {
            let meal_plan_id: String
            let from: String
            let to: String
        }
        struct Response: Decodable {
            let added: Int
            let merged: Int
            let list: ShoppingList
        }

        generating = true
        errorMessage = nil
        resultMessage = nil
        defer { generating = false }
        do {
            let response: Response = try await APIClient.shared.send(
                "POST",
                path: "/api/shopping-list/\(targetListId)/generate-from-meal-plan",
                body: Body(
                    meal_plan_id: mealPlanId,
                    from: ymd(fromDate),
                    to: ymd(toDate)
                )
            )
            resultMessage = "Added \(response.added), merged \(response.merged)."
            onCompleted(response.list)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

#Preview {
    ShoppingListView()
}
