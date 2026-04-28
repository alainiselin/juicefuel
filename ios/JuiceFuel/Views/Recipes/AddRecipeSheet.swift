import SwiftUI

struct AddRecipeSheet: View {
    var onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var instructions = ""
    @State private var sourceURL = ""

    @State private var libraryId: String?
    @State private var phase: Phase = .loading
    @State private var saving = false
    @State private var errorMessage: String?

    enum Phase { case loading, ready, error(String) }

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
                    Section("Description") {
                        TextField("One-line summary", text: $description, axis: .vertical)
                            .lineLimit(2...4)
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
            .navigationTitle("New recipe")
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
            .task { await loadLibrary() }
        }
    }

    private var canSave: Bool {
        !title.trimmingCharacters(in: .whitespaces).isEmpty && libraryId != nil
    }

    private func loadLibrary() async {
        do {
            let households: [HouseholdSummary] = try await APIClient.shared.send("GET", path: "/api/households")
            guard let library = households.first?.recipeLibraries?.first else {
                phase = .error("No recipe library found in your household.")
                return
            }
            libraryId = library.id
            phase = .ready
        } catch {
            phase = .error(error.localizedDescription)
        }
    }

    private func save() async {
        guard let libraryId else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let recipe_library_id: String
            let title: String
            let description: String?
            let instructions_markdown: String?
            let source_url: String?
        }
        let body = Body(
            recipe_library_id: libraryId,
            title: title.trimmingCharacters(in: .whitespaces),
            description: description.isEmpty ? nil : description,
            instructions_markdown: instructions.isEmpty ? nil : instructions,
            source_url: sourceURL.isEmpty ? nil : sourceURL
        )
        do {
            _ = try await APIClient.shared.sendVoid("POST", path: "/api/recipes", body: body)
            onAdded()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
