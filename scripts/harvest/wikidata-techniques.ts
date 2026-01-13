/**
 * Harvest cooking technique tags from Wikidata
 * Query: all instances of "cooking technique" (Q2995644)
 * Fetch English labels only
 */

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';

const TECHNIQUE_QUERY = `
SELECT DISTINCT ?item ?itemLabel WHERE {
  ?item wdt:P31/wdt:P279* wd:Q2995644.
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 300
`;

interface WikidataResult {
  results: {
    bindings: Array<{
      itemLabel: { value: string };
    }>;
  };
}

async function fetchTechniques(): Promise<string[]> {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(TECHNIQUE_QUERY)}&format=json`;
  
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
        label.split(' ').length <= 4 &&
        label.length > 2 &&
        label.length < 50
      );
    });
}

export { fetchTechniques };
