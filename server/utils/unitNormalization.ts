// Unit normalization: convert quantities within the same dimension family to a
// canonical unit so a recipe asking for "1 tbsp" and another asking for "30 ml"
// can be summed when they appear in the same shopping aggregation.
//
// We do NOT convert across families (mass <-> volume) because that requires per-
// ingredient densities which we don't track.

export type UnitFamily = 'mass' | 'volume' | 'count';

export interface NormalizedUnit {
  family: UnitFamily;
  /** The unit we report back after summing (the canonical for the family). */
  canonical: 'G' | 'ML' | 'PIECE';
  /** Multiplier to convert quantity-in-this-unit to the canonical. */
  toCanonical: number;
}

/**
 * Map a unit string (the Unit enum value as it lives in the DB) to its family + conversion.
 * Returns `null` for units we don't classify (PACKAGE, OTHER, anything unknown). Callers
 * should keep those entries un-normalized, keyed by the original unit.
 */
export function classifyUnit(unit: string | null): NormalizedUnit | null {
  switch (unit) {
    case 'G':
      return { family: 'mass', canonical: 'G', toCanonical: 1 };
    case 'KG':
      return { family: 'mass', canonical: 'G', toCanonical: 1000 };
    case 'ML':
      return { family: 'volume', canonical: 'ML', toCanonical: 1 };
    case 'L':
      return { family: 'volume', canonical: 'ML', toCanonical: 1000 };
    case 'TSP':
      return { family: 'volume', canonical: 'ML', toCanonical: 5 };
    case 'TBSP':
      return { family: 'volume', canonical: 'ML', toCanonical: 15 };
    case 'CUP':
      return { family: 'volume', canonical: 'ML', toCanonical: 250 };
    case 'PIECE':
      return { family: 'count', canonical: 'PIECE', toCanonical: 1 };
    default:
      // PACKAGE, OTHER, null, anything unknown — don't try to normalize.
      return null;
  }
}
