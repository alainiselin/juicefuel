import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife")
                .font(.system(size: 64))
                .foregroundStyle(.tint)
            Text("JuiceFuel")
                .font(.largeTitle.bold())
            Text("Scaffold OK")
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
