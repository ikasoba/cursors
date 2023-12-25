import { Handlers } from "$fresh/server.ts";
import seedrandom from "seedrandom";
import { genSeed } from "../utils/genSeed.ts";

export const handler: Handlers = {
  GET(req, ctx) {
    const rng = seedrandom(
      "061662bdbd2e9ba6" + Math.floor(Date.now() / 1000 / 60 / 60 / 24),
    );
    const seed = genSeed(rng);

    return new Response("", {
      status: 301,
      headers: {
        Location: new URL(`./m/${seed}`, req.url).toString(),
      },
    });
  },
};
