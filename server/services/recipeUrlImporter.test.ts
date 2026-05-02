import { describe, expect, it } from 'vitest';
import { assertSafeRecipeUrl, extractRecipeFromHtml } from './recipeUrlImporter';

describe('recipeUrlImporter', () => {
  it('extracts a recipe from JSON-LD', () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Lemon Pasta",
              "description": "Bright pasta with lemon and parmesan.",
              "recipeYield": "4 servings",
              "prepTime": "PT10M",
              "cookTime": "PT15M",
              "totalTime": "PT25M",
              "recipeIngredient": [
                "400 g spaghetti",
                "1 lemon, zested",
                "50 g parmesan"
              ],
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Cook the pasta." },
                { "@type": "HowToStep", "text": "Toss with lemon and cheese." }
              ]
            }
          </script>
        </head>
      </html>
    `;

    const recipe = extractRecipeFromHtml(html);

    expect(recipe.extraction_method).toBe('json-ld');
    expect(recipe.title).toBe('Lemon Pasta');
    expect(recipe.servings).toBe(4);
    expect(recipe.prep_min).toBe(10);
    expect(recipe.cook_min).toBe(15);
    expect(recipe.total_min).toBe(25);
    expect(recipe.ingredients).toEqual([
      '400 g spaghetti',
      '1 lemon, zested',
      '50 g parmesan',
    ]);
    expect(recipe.steps).toEqual([
      'Cook the pasta.',
      'Toss with lemon and cheese.',
    ]);
  });

  it('finds a recipe nested in an @graph', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@graph": [
            { "@type": "WebPage", "name": "Page" },
            {
              "@type": ["Recipe", "Article"],
              "name": "Tomato Soup",
              "recipeIngredient": ["tomatoes", "stock"],
              "recipeInstructions": {
                "@type": "HowToSection",
                "itemListElement": [
                  { "@type": "HowToStep", "name": "Simmer everything." }
                ]
              }
            }
          ]
        }
      </script>
    `;

    const recipe = extractRecipeFromHtml(html);

    expect(recipe.extraction_method).toBe('json-ld');
    expect(recipe.title).toBe('Tomato Soup');
    expect(recipe.ingredients).toEqual(['tomatoes', 'stock']);
    expect(recipe.steps).toEqual(['Simmer everything.']);
  });

  it('falls back to page metadata when no recipe schema exists', () => {
    const html = `
      <html>
        <head>
          <title>Best Waffles</title>
          <meta name="description" content="Crisp weekend waffles">
        </head>
      </html>
    `;

    const recipe = extractRecipeFromHtml(html);

    expect(recipe.extraction_method).toBe('html-metadata');
    expect(recipe.title).toBe('Best Waffles');
    expect(recipe.description).toBe('Crisp weekend waffles');
    expect(recipe.ingredients).toEqual([]);
    expect(recipe.steps).toEqual([]);
  });

  it('blocks local URLs', () => {
    expect(() => assertSafeRecipeUrl('http://localhost:3000/recipe')).toThrow(
      'public web page'
    );
  });
});
