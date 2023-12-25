import * as PIXI from "pixi.js";
import { tick } from "./tick.ts";

export function TitleText(text: PIXI.Text, ticker: PIXI.Ticker) {
  const startTime = Date.now();
  let isVisible = false;
  let prevBlinkTime = 0;

  tick(ticker, (_, __, cancel) => {
    text.alpha = isVisible ? 1 : 0;

    if (Date.now() - startTime >= 10000) {
      cancel();
      text.parent.removeChild(text);
      return;
    }

    if (Date.now() - prevBlinkTime >= 500) {
      prevBlinkTime = Date.now();
      isVisible = !isVisible;
    }
  });
}
