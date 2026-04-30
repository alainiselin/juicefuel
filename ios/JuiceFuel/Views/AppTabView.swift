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

            ProfileView(auth: auth)
                .tabItem { Label("Me", systemImage: "person.crop.circle") }
        }
        .tint(JuiceFuelTheme.primary)
    }
}
