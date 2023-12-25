import * as PIXI from "pixi.js";

export function tick<T extends object>(ticker: PIXI.Ticker, fn: (delta: number, ctx: T, cancel: () => void) => void) {
  function _fn(this: T, delta: number) {
    fn(delta, this, () => {
      ticker.remove(_fn);
    });
  }

  ticker.add(_fn);
}