import { useSignal } from "@preact/signals";
import { PageProps } from "$fresh/server.ts";
import { GameMain } from "../../islands/GameMain.tsx";

export default function MazePage(props: PageProps) {
  return (
    <div>
      <GameMain firstSeed={props.params.seed} />
    </div>
  );
}
