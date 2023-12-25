export function genSeed(rng = Math.random) {
  return Array.from(
    { length: 8 },
    () => Math.floor(rng() * 256).toString(16).padStart(2, "0"),
  ).join("");
}
