import SwiftUI

struct AppTabView: View {
    let auth: AuthService

    var body: some View {
        TabView {
            RecipesListView()
                .tabItem { Label("Recipes", systemImage: "book.closed") }

            PlannerView()
                .tabItem { Label("Plan", systemImage: "calendar") }

            ShoppingListView()
                .tabItem { Label("Shopping", systemImage: "cart") }

            profileTab
                .tabItem { Label("Me", systemImage: "person.crop.circle") }
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
