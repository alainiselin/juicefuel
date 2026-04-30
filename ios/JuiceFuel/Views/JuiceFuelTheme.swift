import SwiftUI

enum JuiceFuelTheme {
    static let primary = Color(red: 0.06, green: 0.46, blue: 0.43)
    static let green = Color(red: 0.09, green: 0.64, blue: 0.29)
    static let amber = Color(red: 0.96, green: 0.62, blue: 0.04)
    static let surface = Color(red: 0.96, green: 0.98, blue: 0.96)

    static var brandGradient: LinearGradient {
        LinearGradient(
            colors: [primary, green, amber],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

struct JuiceFuelMark: View {
    var size: CGFloat = 72

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.22, style: .continuous)
                .fill(JuiceFuelTheme.brandGradient)
            Image(systemName: "leaf.fill")
                .font(.system(size: size * 0.42, weight: .bold))
                .foregroundStyle(.white)
                .offset(x: -size * 0.06, y: -size * 0.05)
            Image(systemName: "bowl.fill")
                .font(.system(size: size * 0.34, weight: .semibold))
                .foregroundStyle(.white.opacity(0.94))
                .offset(y: size * 0.18)
        }
        .frame(width: size, height: size)
        .shadow(color: JuiceFuelTheme.primary.opacity(0.22), radius: size * 0.12, y: size * 0.08)
        .accessibilityHidden(true)
    }
}

struct BrandedLoadingView: View {
    let title: String
    let subtitle: String?

    var body: some View {
        VStack(spacing: 18) {
            JuiceFuelMark(size: 88)
            VStack(spacing: 6) {
                Text(title)
                    .font(.title2.bold())
                if let subtitle {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
            }
            ProgressView()
                .tint(JuiceFuelTheme.primary)
        }
        .padding(28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(JuiceFuelTheme.surface)
    }
}
