import SwiftUI

struct AppTabView: View {
    let auth: AuthService

    var body: some View {
        TabView {
            placeholder("Recipes", systemImage: "book.closed", message: "Recipes coming next")
                .tabItem { Label("Recipes", systemImage: "book.closed") }

            placeholder("Plan", systemImage: "calendar", message: "Weekly planner coming soon")
                .tabItem { Label("Plan", systemImage: "calendar") }

            placeholder("Shopping", systemImage: "cart", message: "Shopping list coming soon")
                .tabItem { Label("Shopping", systemImage: "cart") }

            profileTab
                .tabItem { Label("Me", systemImage: "person.crop.circle") }
        }
    }

    private func placeholder(_ title: String, systemImage: String, message: String) -> some View {
        NavigationStack {
            VStack(spacing: 12) {
                Image(systemName: systemImage)
                    .font(.system(size: 48))
                    .foregroundStyle(.tertiary)
                Text(message).foregroundStyle(.secondary)
            }
            .navigationTitle(title)
        }
    }

    private var profileTab: some View {
        NavigationStack {
            List {
                Section("Account") {
                    if let user = auth.currentUser {
                        LabeledContent("Name", value: user.displayName ?? "—")
                        LabeledContent("Email", value: user.email ?? "—")
                    }
                }
                Section {
                    Button("Sign out", role: .destructive) {
                        auth.signOut()
                    }
                }
            }
            .navigationTitle("Me")
        }
    }
}
