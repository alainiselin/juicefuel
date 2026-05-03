import SwiftUI

struct ContentView: View {
    @State private var auth = AuthService.shared
    @State private var didRestore = false

    var body: some View {
        Group {
            if !didRestore {
                BrandedLoadingView(
                    title: "JuiceFuel",
                    subtitle: "Getting your kitchen ready"
                )
            } else if auth.isSignedIn {
                AppTabView(auth: auth)
            } else {
                LoginView(auth: auth)
            }
        }
        .task {
            await auth.restoreSession()
            didRestore = true
        }
        .keyboardDoneToolbar()
    }
}

#Preview {
    ContentView()
}
