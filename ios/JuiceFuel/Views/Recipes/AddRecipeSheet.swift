import SwiftUI

struct AddRecipeSheet: View {
    let existingRecipe: Recipe?
    var onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var instructions = ""
    @State private var sourceURL = ""
    @State private var baseServings = ""
    @State private var prepTimeMinutes = ""

    @State private var libraryId: String?
    @State private var libraries: [RecipeLibrary] = []
    @State private var showingCreateLibrary = false
    @State private var phase: Phase = .loading
    @State private var saving = false
    @State private var errorMessage: String?

    enum Phase { case loading, ready, error(String) }

    init(existingRecipe: Recipe? = nil, onAdded: @escaping () -> Void) {
        self.existingRecipe = existingRecipe
        self.onAdded = onAdded
        _title = State(initialValue: existingRecipe?.title ?? "")
        _description = State(initialValue: existingRecipe?.description ?? "")
        _instructions = State(initialValue: existingRecipe?.instructionsMarkdown ?? "")
        _sourceURL = State(initialValue: existingRecipe?.sourceURL ?? "")
        _baseServings = State(initialValue: existingRecipe?.baseServings.map(String.init) ?? "")
        _prepTimeMinutes = State(initialValue: existingRecipe?.prepTimeMinutes.map(String.init) ?? "")
        _libraryId = State(initialValue: existingRecipe?.recipeLibraryId)
        _phase = State(initialValue: existingRecipe == nil ? .loading : .ready)
    }

    var body: some View {
        NavigationStack {
            Form {
                switch phase {
                case .loading:
                    Section {
                        HStack { ProgressView(); Text("Preparing…") }
                    }
                case .error(let msg):
                    Section { Text(msg).foregroundStyle(.red) }
                case .ready:
                    Section("Title") {
                        TextField("e.g. Pasta Pomodoro", text: $title)
                            .autocorrectionDisabled()
                    }
                    if existingRecipe == nil {
                        Section("Library") {
                            if libraries.isEmpty {
                                Text("No libraries found")
                                    .foregroundStyle(.secondary)
                            } else {
                                Picker("Library", selection: Binding(
                                    get: { libraryId ?? "" },
                                    set: { libraryId = $0 }
                                )) {
                                    ForEach(libraries) { library in
                                        Text(library.name).tag(library.id)
                                    }
                                }
                            }
                            Button {
                                showingCreateLibrary = true
                            } label: {
                                Label("New library", systemImage: "plus")
                            }
                        }
                    }
                    Section("Description") {
                        TextField("One-line summary", text: $description, axis: .vertical)
                            .lineLimit(2...4)
                    }
                    Section("Basics") {
                        TextField("Servings", text: $baseServings)
                            .keyboardType(.numberPad)
                        TextField("Prep time in minutes", text: $prepTimeMinutes)
                            .keyboardType(.numberPad)
                    }
                    Section("Instructions") {
                        TextField("Step-by-step (Markdown supported)", text: $instructions, axis: .vertical)
                            .lineLimit(6...20)
                            .font(.body.monospaced())
                    }
                    Section("Source URL") {
                        TextField("https://…", text: $sourceURL)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .keyboardType(.URL)
                    }
                }

                if let errorMessage {
                    Section { Text(errorMessage).font(.footnote).foregroundStyle(.red) }
                }
            }
            .navigationTitle(existingRecipe == nil ? "New recipe" : "Edit recipe")
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
                    .disabled(!canSave || saving)
                }
            }
            .scrollDismissesKeyboard(.interactively)
            .task {
                if existingRecipe == nil {
                    await loadLibraries()
                }
            }
            .sheet(isPresented: $showingCreateLibrary) {
                CreateRecipeLibrarySheet { library in
                    libraries.insert(library, at: 0)
                    libraryId = library.id
                }
            }
        }
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty && libraryId != nil
    }

    private func loadLibraries() async {
        do {
            let result: [RecipeLibrary] = try await APIClient.shared.send("GET", path: "/api/recipe-libraries")
            let ownLibraries = result.filter { $0.isOwnHousehold == true }
            guard let library = ownLibraries.first else {
                phase = .error("No recipe library found in your household.")
                return
            }
            libraries = ownLibraries
            libraryId = library.id
            phase = .ready
        } catch {
            phase = .error(error.localizedDescription)
        }
    }

    private func save() async {
        guard let libraryId else { return }
        Keyboard.dismiss()
        saving = true
        errorMessage = nil
        defer { saving = false }

        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedDescription = description.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedInstructions = instructions.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedSourceURL = sourceURL.trimmingCharacters(in: .whitespacesAndNewlines)
        let servings = Int(baseServings.trimmingCharacters(in: .whitespacesAndNewlines))
        let prep = Int(prepTimeMinutes.trimmingCharacters(in: .whitespacesAndNewlines))

        if !baseServings.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && servings == nil {
            errorMessage = "Servings must be a whole number."
            return
        }
        if !prepTimeMinutes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && prep == nil {
            errorMessage = "Prep time must be a whole number."
            return
        }

        struct Body: Encodable {
            let recipe_library_id: String
            let title: String
            let description: String?
            let instructions_markdown: String?
            let source_url: String?
        }
        do {
            if let existingRecipe {
                struct UpdateBody: Encodable {
                    let title: String
                    let description: String?
                    let base_servings: Int?
                    let prep_time_minutes: Int?
                    let instructions_markdown: String?
                    let source_url: String?
                }
                let updateBody = UpdateBody(
                    title: trimmedTitle,
                    description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                    base_servings: servings,
                    prep_time_minutes: prep,
                    instructions_markdown: trimmedInstructions.isEmpty ? nil : trimmedInstructions,
                    source_url: trimmedSourceURL.isEmpty ? nil : trimmedSourceURL
                )
                _ = try await APIClient.shared.sendVoid("PATCH", path: "/api/recipes/\(existingRecipe.id)", body: updateBody)
            } else {
                let body = Body(
                    recipe_library_id: libraryId,
                    title: trimmedTitle,
                    description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                    instructions_markdown: trimmedInstructions.isEmpty ? nil : trimmedInstructions,
                    source_url: trimmedSourceURL.isEmpty ? nil : trimmedSourceURL
                )
                _ = try await APIClient.shared.sendVoid("POST", path: "/api/recipes", body: body)
            }
            onAdded()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct CreateRecipeLibrarySheet: View {
    var onCreated: (RecipeLibrary) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var isPublic = false
    @State private var saving = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Library") {
                    TextField("Name", text: $name)
                    Toggle("Public", isOn: $isPublic)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("New library")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await save() }
                    } label: {
                        if saving { ProgressView() } else { Text("Create") }
                    }
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                }
            }
            .scrollDismissesKeyboard(.interactively)
        }
    }

    private func save() async {
        Keyboard.dismiss()
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let name: String
            let is_public: Bool
        }

        do {
            let library: RecipeLibrary = try await APIClient.shared.send(
                "POST",
                path: "/api/recipe-libraries",
                body: Body(
                    name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                    is_public: isPublic
                )
            )
            onCreated(library)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
