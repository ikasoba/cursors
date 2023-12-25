import { Handlers } from "$fresh/server.ts";
import seedrandom from "seedrandom";
import { genSeed } from "../utils/genSeed.ts";
import { GameMain } from "../islands/GameMain.tsx";

export default function Page() {
  const rng = seedrandom(
    "061662bdbd2e9ba6" + Math.floor(Date.now() / 1000 / 60 / 60 / 24),
  );
  const seed = genSeed(rng);

  return (
    <div>
      <GameMain firstSeed={seed} />
    </div>
  );
}