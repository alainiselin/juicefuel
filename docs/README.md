# JuiceFuel Documentation

Welcome to the JuiceFuel documentation!

## Getting Started

New to JuiceFuel? Start here:

1. **[Development Setup](./guides/development-setup.md)** - Get the app running locally
2. **[Seeding Test Data](./guides/seeding-test-data.md)** - Create test users and data
3. **[Architecture Overview](./architecture/system-overview.md)** - Understand the system design

## Documentation Structure

### 📐 [Architecture](./architecture/)
System-level documentation:
- [System Overview](./architecture/system-overview.md) - Component hierarchy and data flow
- [Layered Architecture](./architecture/layered-architecture.md) - Service/Repo/API pattern
- [Type Safety](./architecture/type-safety.md) - Zod schemas and TypeScript

### 🏗️ [Domains](./domains/)
Feature-specific documentation organized by domain:

- **[Authentication](./domains/authentication/)** - User auth, sessions, OAuth
- **[Households](./domains/households/)** - Multi-household management
- **[Profiles](./domains/profiles/)** - User profile management
- **[Recipes](./domains/recipes/)** - Recipe library and management
- **[Ingredients](./domains/ingredients/)** - Ingredient taxonomy and search
- **[Shopping](./domains/shopping/)** - Shopping list system
- **[Planner](./domains/planner/)** - Meal planning
- **[Tags](./domains/tags/)** - Recipe tagging system

### 💡 [Concepts](./concepts/)
Core design concepts explained:
- [Rubric-Based Organization](./concepts/rubric-based-organization.md) - Why fixed shopping categories
- [Active Household Pattern](./concepts/active-household-pattern.md) - Single active household UX
- [Public/Private Libraries](./concepts/public-private-libraries.md) - Recipe sharing model

### 📝 [Decisions](./decisions/)
Architectural decision records:
- Why we chose specific approaches
- Trade-offs considered
- Rationale preserved

### 📖 [Guides](./guides/)
How-to documentation:
- [Development Setup](./guides/development-setup.md)
- [API Testing](./guides/api-testing.md)
- [Seeding Test Data](./guides/seeding-test-data.md)
- [Deployment](./guides/deployment.md)
- [iOS Development](./guides/ios-development.md)
- [iOS Parity Roadmap](./guides/ios-parity-roadmap.md)
- [iOS TestFlight Readiness](./guides/ios-testflight-readiness.md)

### 📦 [Archive](./archive/)
Historical notes and deprecated documentation:
- Implementation logs
- Bug fix notes
- Migration summaries
- Preserved for historical context

## Navigation Tips

### Wiki-Style Links
Documents use wiki-style links for easy navigation:
```markdown
See [[auth-system-overview]] for details.
```

### Frontmatter
Many documents include metadata:
```yaml
---
title: Document Title
category: domain | concept | decision | guide
domain: authentication | recipes | shopping | etc.
status: draft | stable | deprecated
---
```

### Related Documentation
Look for "Related Documentation" sections at the bottom of each document for related topics.

## Contributing to Docs

When adding new documentation:

1. **Choose the right location:**
   - Domain-specific? → `/domains/{domain}/`
   - Concept explanation? → `/concepts/`
   - Architectural decision? → `/decisions/`
   - How-to guide? → `/guides/`
   - Historical note? → `/archive/`

2. **Follow naming conventions:**
   - Use kebab-case: `feature-name.md`
   - Be descriptive: `google-oauth-setup.md` not `oauth.md`

3. **Add frontmatter** (recommended for core docs):
   ```yaml
   ---
   title: Document Title
   category: domain
   status: stable
   ---
   ```

4. **Link related docs:**
   - Use wiki-style links: `[[other-doc]]`
   - Or relative paths: `[Other Doc](./other-doc.md)`

5. **Keep it atomic:**
   - One concept per document
   - Split large docs into smaller notes

## Quick Reference

### Common Tasks
- **How do I run the app?** → [Development Setup](./guides/development-setup.md)
- **How do I test APIs?** → [API Testing Guide](./guides/api-testing.md)
- **How does auth work?** → [Authentication Overview](./domains/authentication/auth-system-overview.md)
- **How are shopping lists organized?** → [Rubric-Based Organization](./concepts/rubric-based-organization.md)
- **Why one active household?** → [Active Household Pattern](./concepts/active-household-pattern.md)
- **What is the current iOS app status?** → [iOS Parity Roadmap](./guides/ios-parity-roadmap.md)
- **What remains before TestFlight?** → [iOS TestFlight Readiness](./guides/ios-testflight-readiness.md)

### Finding Information
- Browse by domain in `/domains/`
- Check `/concepts/` for "why" questions
- Look in `/decisions/` for design rationale
- Search `/archive/` for historical context

## Questions?

If documentation is unclear or missing:
1. Check `/archive/` for historical context
2. Review git history for that area of code
3. Open an issue to request clarification
