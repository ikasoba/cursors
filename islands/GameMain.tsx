import { useSignal, useSignalEffect } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import * as PIXI from "pixi.js";
import { asset } from "$fresh/runtime.ts";
import { MazeScene } from "../game/MazeScene.ts";

export function GameMain({ firstSeed }: { firstSeed: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appSignal = useSignal<PIXI.Application | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    appSignal.value = new PIXI.Application({
      view: canvasRef.current,
      resizeTo: window,
      background: "#fff",
    });
  }, [canvasRef]);

  useSignalEffect(() => {
    if (!appSignal.value) return;

    const app = appSignal.value;

    MazeScene({
      app,
      seed: firstSeed
    });
  });

  return <canvas ref={canvasRef} />;
}
