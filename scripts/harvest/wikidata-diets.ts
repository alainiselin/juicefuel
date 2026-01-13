/**
 * Harvest diet tags from Wikidata
 * Query: all instances of "diet" (Q1060829)
 * Fetch English labels only
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

const DIET_QUERY = `
SELECT DISTINCT ?item ?itemLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:Q1060829.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 200
`;

interface WikidataResult {
  results: {
    bindings: Array<{
      itemLabel: { value: string };
    }>;
  };
}

async function fetchDiets(): Promise<string[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(DIET_QUERY)}&format=json`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'JuiceFuel-TagHarvester/1.0',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status}`);
  }

  const data: WikidataResult = await response.json();
  
  return data.results.bindings
    .map(b => b.itemLabel.value)
    .filter(label => {
      const lower = label.toLowerCase();
      return (
        !lower.includes('list of') &&
        !lower.includes('category:') &&
        !lower.match(/^q\d+$/) &&
        label.split(' ').length <= 3 &&
        label.length > 2 &&
        label.length < 50
      );
    });
}

export { fetchDiets };
