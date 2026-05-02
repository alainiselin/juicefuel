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

  it('fills Recipe JSON-LD from server-rendered ingredient and direction lists', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": "Butter Chicken",
          "prepTime": "30 min + overnight",
          "cookTime": "1 hour",
          "recipeYield": "4"
        }
      </script>
      <article class="ingredients-list w-richtext">
        <p><strong>Marinade:</strong></p>
        <ul><li>1 cup yogurt</li><li>1.5 lbs chicken thighs</li></ul>
      </article>
      <div class="directions-list w-richtext">
        <p><strong>Cook:</strong></p>
        <ol><li>Marinate the chicken.</li><li>Simmer in sauce.</li></ol>
      </div>
    `;

    const recipe = extractRecipeFromHtml(html);

    expect(recipe.extraction_method).toBe('microdata');
    expect(recipe.title).toBe('Butter Chicken');
    expect(recipe.servings).toBe(4);
    expect(recipe.prep_min).toBe(30);
    expect(recipe.cook_min).toBe(60);
    expect(recipe.ingredients).toEqual(['1 cup yogurt', '1.5 lbs chicken thighs']);
    expect(recipe.steps).toEqual(['Marinate the chicken.', 'Simmer in sauce.']);
  });

  it('combines HowTo JSON-LD with recipeIngredient microdata', () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          "name": "Asparagus Cannelloni",
          "totalTime": 65,
          "step": [
            { "@type": "HowToStep", "itemListElement": { "@type": "HowToDirection", "text": "Blanch asparagus." } },
            { "@type": "HowToStep", "itemListElement": { "@type": "HowToDirection", "text": "Bake until golden." } }
          ]
        }
      </script>
      <table>
        <tr itemprop="recipeIngredient"><td>12</td><th>lasagne sheets</th></tr>
        <tr itemprop="recipeIngredient"><td>700 g</td><th>green asparagus</th></tr>
      </table>
      <meta itemprop="prepTime" content="PT40M">
      <meta itemprop="cookTime" content="PT25M">
    `;

    const recipe = extractRecipeFromHtml(html);

    expect(recipe.extraction_method).toBe('microdata');
    expect(recipe.title).toBe('Asparagus Cannelloni');
    expect(recipe.prep_min).toBe(40);
    expect(recipe.cook_min).toBe(25);
    expect(recipe.total_min).toBe(65);
    expect(recipe.ingredients).toEqual(['12 lasagne sheets', '700 g green asparagus']);
    expect(recipe.steps).toEqual(['Blanch asparagus.', 'Bake until golden.']);
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
