import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @Bindable var auth: AuthService

    @State private var mode: Mode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""

    enum Mode: String, CaseIterable, Identifiable {
        case login = "Sign in"
        case signup = "Sign up"
        var id: Self { self }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 22) {
                header

                Picker("Mode", selection: $mode) {
                    ForEach(Mode.allCases) { m in Text(m.rawValue).tag(m) }
                }
                .pickerStyle(.segmented)

                fields

                primaryButton

                divider

                SignInWithAppleButton(.signIn) { request in
                    request.requestedScopes = [.fullName, .email]
                } onCompletion: { result in
                    Task {
                        switch result {
                        case .success(let auth):
                            await self.auth.signInWithApple(authorization: auth)
                        case .failure(let error):
                            // User cancelled is a common, non-error case
                            let nsError = error as NSError
                            if nsError.code != ASAuthorizationError.canceled.rawValue {
                                self.auth.errorMessage = error.localizedDescription
                            }
                        }
                    }
                }
                .signInWithAppleButtonStyle(.black)
                .frame(height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Button {
                    Task { await auth.signInWithGoogle() }
                } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "g.circle.fill")
                            .font(.title3)
                        Text("Continue with Google")
                            .font(.body.weight(.medium))
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                }
                .buttonStyle(.bordered)
                .disabled(auth.isLoading)

                if let message = auth.errorMessage {
                    Text(message)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Spacer()
            }
            .padding(20)
            .background(JuiceFuelTheme.surface)
            .navigationTitle("JuiceFuel")
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private var header: some View {
        VStack(spacing: 12) {
            JuiceFuelMark(size: 92)
            Text("JuiceFuel")
                .font(.largeTitle.bold())
            Text("Plan meals. Shop smart.")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 24)
    }

    @ViewBuilder
    private var fields: some View {
        VStack(spacing: 12) {
            if mode == .signup {
                TextField("Name", text: $displayName)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.name)
                    .autocorrectionDisabled()
            }
            TextField("Email", text: $email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            SecureField("Password", text: $password)
                .textFieldStyle(.roundedBorder)
                .textContentType(mode == .signup ? .newPassword : .password)
        }
    }

    private var primaryButton: some View {
        Button {
            Task {
                switch mode {
                case .login:
                    await auth.login(email: email, password: password)
                case .signup:
                    await auth.signup(email: email, password: password, displayName: displayName)
                }
            }
        } label: {
            HStack {
                if auth.isLoading { ProgressView().tint(.white) }
                Text(mode.rawValue)
                    .font(.headline)
            }
            .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(.borderedProminent)
        .disabled(auth.isLoading || !canSubmit)
    }

    private var canSubmit: Bool {
        guard !email.isEmpty, !password.isEmpty else { return false }
        if mode == .signup { return !displayName.isEmpty }
        return true
    }

    private var divider: some View {
        HStack {
            Rectangle().fill(Color.secondary.opacity(0.3)).frame(height: 1)
            Text("or").font(.caption).foregroundStyle(.secondary)
            Rectangle().fill(Color.secondary.opacity(0.3)).frame(height: 1)
        }
    }
}

#Preview {
    LoginView(auth: AuthService.shared)
}
