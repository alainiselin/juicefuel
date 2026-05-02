# Stock Recipes

This folder contains the public stock recipe library source data.

- `manifest.json` is the normalized recipe list and prompt source.
- `generated/*.json` are validated AI-generated recipe drafts matching `RecipeDraftSchema`.

## Generate

Generate all missing recipe drafts:

```bash
npm run generate:stock-recipes
```

Regenerate one draft:

```bash
npm run generate:stock-recipes -- --only=pho --force
```

## Import

Import into a specific public recipe library:

```bash
npm run import:stock-recipes -- --library-id=<recipe-library-uuid>
```

Preview changes first:

```bash
npm run import:stock-recipes -- --library-id=<recipe-library-uuid> --dry-run
```

The importer is idempotent by `recipe_library_id + title`: existing recipes are updated, ingredients are replaced from the generated draft, and tags are refreshed.
