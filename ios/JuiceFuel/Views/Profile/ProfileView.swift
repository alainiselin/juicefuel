import SwiftUI

struct ProfileView: View {
    let auth: AuthService

    @State private var profile: User?
    @State private var households: [HouseholdSummary] = []
    @State private var activeHousehold: ActiveHousehold?
    @State private var members: [HouseholdMember] = []
    @State private var userRole: String?
    @State private var inviteURL: String?
    @State private var joinCode = ""
    @State private var loading = true
    @State private var saving = false
    @State private var errorMessage: String?
    @State private var showingProfileEdit = false
    @State private var showingHouseholdRename = false
    @State private var memberToRemove: HouseholdMember?
    @State private var confirmingLeave = false
    @State private var confirmingDelete = false

    var body: some View {
        NavigationStack {
            List {
                if loading {
                    Section {
                        HStack {
                            ProgressView()
                            Text("Loading account...")
                        }
                    }
                }

                Section("Account") {
                    if let profile {
                        LabeledContent("Name", value: profile.displayName ?? "-")
                        LabeledContent("Email", value: profile.email ?? "-")
                        Button("Edit profile") {
                            showingProfileEdit = true
                        }
                    }
                }

                Section("Active household") {
                    if let activeHousehold {
                        LabeledContent("Name", value: activeHousehold.name)
                        if let userRole {
                            LabeledContent("Your role", value: userRole)
                        }
                        if userRole == "OWNER" {
                            Button("Rename household") {
                                showingHouseholdRename = true
                            }
                            Button("Generate invite link") {
                                Task { await generateInvite() }
                            }
                        }
                        if let inviteURL {
                            ShareLink(item: inviteURL) {
                                Label("Share invite", systemImage: "square.and.arrow.up")
                            }
                            Text(inviteURL)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                                .textSelection(.enabled)
                        }
                        Button("Leave household", role: .destructive) {
                            confirmingLeave = true
                        }
                        if userRole == "OWNER" {
                            Button("Delete household", role: .destructive) {
                                confirmingDelete = true
                            }
                        }
                    }
                }

                Section("Switch household") {
                    ForEach(households) { household in
                        Button {
                            Task { await switchHousehold(household.id) }
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(household.name)
                                    if let role = household.userRole {
                                        Text(role.lowercased())
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                                Spacer()
                                if household.id == activeHousehold?.id {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                }

                Section("Join household") {
                    TextField("Invite code", text: $joinCode)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    Button("Join") {
                        Task { await joinHousehold() }
                    }
                    .disabled(joinCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                }

                if !members.isEmpty {
                    Section("Members") {
                        ForEach(members) { member in
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(member.user.displayName ?? member.user.email ?? "Member")
                                    Text(member.user.email ?? "")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if userRole == "OWNER" && member.userId != auth.currentUser?.id {
                                    Menu(member.role.capitalized) {
                                        ForEach(["OWNER", "ADMIN", "MEMBER"], id: \.self) { role in
                                            Button(role.capitalized) {
                                                Task { await updateMember(member, role: role) }
                                            }
                                            .disabled(member.role == role)
                                        }
                                        Divider()
                                        Button("Remove", role: .destructive) {
                                            memberToRemove = member
                                        }
                                    }
                                } else {
                                    Text(member.role.lowercased())
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
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

                Section {
                    Button("Sign out", role: .destructive) {
                        auth.signOut()
                    }
                }
            }
            .navigationTitle("Me")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        Task { await load() }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
            .task { await load() }
            .refreshable { await load() }
            .sheet(isPresented: $showingProfileEdit) {
                EditProfileSheet(profile: profile) {
                    await load()
                }
            }
            .sheet(isPresented: $showingHouseholdRename) {
                RenameHouseholdSheet(household: activeHousehold) {
                    await load()
                }
            }
            .confirmationDialog(
                "Remove member?",
                isPresented: Binding(
                    get: { memberToRemove != nil },
                    set: { if !$0 { memberToRemove = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Remove member", role: .destructive) {
                    if let memberToRemove {
                        Task { await removeMember(memberToRemove) }
                    }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes the member from the active household.")
            }
            .confirmationDialog(
                "Leave household?",
                isPresented: $confirmingLeave,
                titleVisibility: .visible
            ) {
                Button("Leave household", role: .destructive) {
                    Task { await leaveHousehold() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("You will lose access to this household unless someone invites you again.")
            }
            .confirmationDialog(
                "Delete household?",
                isPresented: $confirmingDelete,
                titleVisibility: .visible
            ) {
                Button("Delete household", role: .destructive) {
                    Task { await deleteHousehold() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This permanently deletes the household and its related data.")
            }
        }
    }

    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }

        do {
            async let loadedProfile: User = APIClient.shared.send("GET", path: "/api/profile")
            async let loadedHouseholds: [HouseholdSummary] = APIClient.shared.send("GET", path: "/api/households")
            async let active: HouseholdDetailResponse = APIClient.shared.send("GET", path: "/api/households/me")
            let (profile, households, activeResponse) = try await (loadedProfile, loadedHouseholds, active)
            self.profile = profile
            self.households = households
            self.activeHousehold = activeResponse.household
            self.members = activeResponse.members
            self.userRole = activeResponse.userRole
            if let inviteCode = activeResponse.household.inviteCode {
                inviteURL = "https://juicefuel.juicecrew.vip/join/\(inviteCode)"
            } else {
                inviteURL = nil
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func switchHousehold(_ householdId: String) async {
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let household_id: String
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "PATCH",
                path: "/api/profile/active-household",
                body: Body(household_id: householdId)
            )
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func generateInvite() async {
        saving = true
        errorMessage = nil
        defer { saving = false }

        do {
            let response: InviteResponse = try await APIClient.shared.send("POST", path: "/api/households/invite")
            inviteURL = response.inviteURL
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func joinHousehold() async {
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let code: String
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "POST",
                path: "/api/households/join",
                body: Body(code: joinCode.trimmingCharacters(in: .whitespacesAndNewlines))
            )
            joinCode = ""
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func updateMember(_ member: HouseholdMember, role: String) async {
        guard let householdId = activeHousehold?.id else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let role: String
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "PATCH",
                path: "/api/households/\(householdId)/members/\(member.userId)",
                body: Body(role: role)
            )
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func removeMember(_ member: HouseholdMember) async {
        guard let householdId = activeHousehold?.id else { return }
        saving = true
        errorMessage = nil
        defer {
            saving = false
            memberToRemove = nil
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "DELETE",
                path: "/api/households/\(householdId)/members/\(member.userId)"
            )
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func leaveHousehold() async {
        guard let householdId = activeHousehold?.id else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let household_id: String
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "POST",
                path: "/api/households/leave",
                body: Body(household_id: householdId)
            )
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func deleteHousehold() async {
        guard let householdId = activeHousehold?.id else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        do {
            _ = try await APIClient.shared.sendVoid(
                "DELETE",
                path: "/api/households/\(householdId)"
            )
            await load()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct EditProfileSheet: View {
    let profile: User?
    var onSaved: () async -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var displayName: String
    @State private var avatarURL: String
    @State private var saving = false
    @State private var errorMessage: String?

    init(profile: User?, onSaved: @escaping () async -> Void) {
        self.profile = profile
        self.onSaved = onSaved
        _displayName = State(initialValue: profile?.displayName ?? "")
        _avatarURL = State(initialValue: profile?.avatarURL ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Profile") {
                    TextField("Display name", text: $displayName)
                    TextField("Avatar URL", text: $avatarURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)
                }
                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Edit profile")
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
                    .disabled(displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                }
            }
        }
    }

    private func save() async {
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let display_name: String
            let avatar_url: String?
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "PATCH",
                path: "/api/profile",
                body: Body(
                    display_name: displayName.trimmingCharacters(in: .whitespacesAndNewlines),
                    avatar_url: avatarURL.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : avatarURL
                )
            )
            await onSaved()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct RenameHouseholdSheet: View {
    let household: ActiveHousehold?
    var onSaved: () async -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var saving = false
    @State private var errorMessage: String?

    init(household: ActiveHousehold?, onSaved: @escaping () async -> Void) {
        self.household = household
        self.onSaved = onSaved
        _name = State(initialValue: household?.name ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Household") {
                    TextField("Name", text: $name)
                }
                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Rename household")
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
                    .disabled(name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || saving)
                }
            }
        }
    }

    private func save() async {
        guard let household else { return }
        saving = true
        errorMessage = nil
        defer { saving = false }

        struct Body: Encodable {
            let name: String
        }

        do {
            _ = try await APIClient.shared.sendVoid(
                "PATCH",
                path: "/api/households/\(household.id)",
                body: Body(name: name.trimmingCharacters(in: .whitespacesAndNewlines))
            )
            await onSaved()
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

struct HouseholdDetailResponse: Codable, Hashable {
    let household: ActiveHousehold
    let members: [HouseholdMember]
    let userRole: String?
}

struct HouseholdMember: Codable, Identifiable, Hashable {
    let userId: String
    let role: String
    let user: HouseholdMemberUser

    var id: String { userId }

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case role
        case user
    }
}

struct HouseholdMemberUser: Codable, Hashable {
    let id: String
    let email: String?
    let displayName: String?
    let avatarURL: String?

    enum CodingKeys: String, CodingKey {
        case id
        case email
        case displayName = "display_name"
        case avatarURL = "avatar_url"
    }
}

struct InviteResponse: Codable, Hashable {
    let inviteCode: String
    let inviteURL: String

    enum CodingKeys: String, CodingKey {
        case inviteCode = "invite_code"
        case inviteURL = "invite_url"
    }
}
