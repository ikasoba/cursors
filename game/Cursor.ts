import * as PIXI from "pixi.js";
import { asset } from "$fresh/runtime.ts";

export class Cursor {
  static async create() {
    const sprite = PIXI.Sprite.from(
      await PIXI.Assets.load(asset("/cursor.svg")),
    );

    sprite.width = 64 * (sprite.width / sprite.height);
    sprite.height = 64;

    return new Cursor(
      sprite,
    );
  }

  constructor(public sprite: PIXI.Sprite) {}
}
