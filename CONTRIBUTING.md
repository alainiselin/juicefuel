# Contributing to JuiceFuel

Thank you for your interest in contributing to JuiceFuel! This document provides guidelines for contributing to the project.

## Getting Started

1. **Read the documentation**: Start with [docs/guides/development-setup.md](docs/guides/development-setup.md) to set up your local environment.

2. **Understand the architecture**: Review [docs/architecture/system-overview.md](docs/architecture/system-overview.md) to understand how the system works.

3. **Check existing issues**: Look for issues labeled `good first issue` or `help wanted`.

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/your-username/juicefuel.git
cd juicefuel
npm install
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Changes

- Follow the existing code style (enforced by ESLint)
- Write tests for new functionality
- Update documentation if you're changing behavior
- Keep commits atomic and well-described

### 4. Test Your Changes

```bash
# Type check
npm run typecheck

# Run linter
npm run lint

# Run tests
npm test -- --run

# Test locally
npm run dev
```

### 5. Commit and Push

```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve bug in shopping list"

git push origin feature/your-feature-name
```

### 6. Create a Pull Request

- Use the pull request template
- Link any related issues
- Provide a clear description of changes
- Wait for review

## Code Style

- **TypeScript**: No `any` types; use proper typing
- **Components**: Follow Vue 3 Composition API patterns
- **Backend**: Follow layered architecture (API → Service → Repository)
- **Tests**: Write tests for business logic and complex functions
- **Docs**: Update relevant documentation in `/docs` folder

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add recipe import from URL
fix: resolve shopping list duplicate items
docs: update authentication setup guide
```

## Pull Request Guidelines

- **Keep PRs focused**: One feature or fix per PR
- **Write clear descriptions**: Explain what and why, not just how
- **Update tests**: Add/update tests for your changes
- **Update docs**: Keep documentation in sync
- **Pass CI checks**: Ensure linting, type checking, and tests pass
- **Respond to feedback**: Be open to suggestions and changes

## Documentation

When adding new features or changing behavior:

1. Update relevant docs in `/docs/domains/`
2. Add examples to `/docs/guides/` if needed
3. Document architectural decisions in `/docs/decisions/`

See [docs/README.md](docs/README.md) for documentation structure.

## Need Help?

- Check the [documentation](docs/README.md)
- Review [existing issues](../../issues)
- Ask questions in issue discussions
- Reference the [architecture docs](docs/architecture/) for technical questions

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
