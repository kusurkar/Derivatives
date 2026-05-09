// Mulberry32 — small deterministic PRNG so synthetic data is stable across renders.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed: number) {
  const r = mulberry32(seed);
  return {
    next: r,
    int: (lo: number, hi: number) => Math.floor(r() * (hi - lo + 1)) + lo,
    pick: <T,>(arr: readonly T[]) => arr[Math.floor(r() * arr.length)],
    /** Box–Muller normal sample. */
    normal: (mean = 0, std = 1) => {
      const u1 = Math.max(r(), 1e-9);
      const u2 = r();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return mean + z * std;
    },
    /** Poisson via Knuth, ok for small lambda. */
    poisson: (lambda: number) => {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= r();
      } while (p > L);
      return k - 1;
    },
  };
}

export type Rng = ReturnType<typeof makeRng>;
