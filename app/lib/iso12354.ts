export const OCTAVE_BANDS = [63, 125, 250, 500, 1000, 2000, 4000, 8000];

// Simple illustrative mass-law TL approximation (not official ISO implementation)
export function massLawTL(frequency: number, massPerArea: number) {
  const m = Math.max(0.001, massPerArea);
  const tl = 20 * Math.log10(m * frequency) - 47.2;
  return Number(tl.toFixed(1));
}

export function tlToTau(tl: number) {
  return Math.pow(10, -tl / 10);
}

// energy-weighted broadband TL (illustrative)
export function broadbandTL(tlBands: number[], bandWidths: number[] = []) {
  const taus = tlBands.map(tlToTau);
  const weights = bandWidths.length === tlBands.length ? bandWidths : new Array(tlBands.length).fill(1);
  const weightedTau = taus.reduce((s, t, i) => s + t * weights[i], 0) / weights.reduce((s, w) => s + w, 0);
  const overallTl = -10 * Math.log10(weightedTau);
  return Number(overallTl.toFixed(1));
}

export function computeIso12354_4(massPerArea: number) {
  const results = OCTAVE_BANDS.map((f) => {
    const tl = massLawTL(f, massPerArea);
    return { freq: f, tl };
  });
  const overall = broadbandTL(results.map((r) => r.tl));
  return { results, overall };
}
