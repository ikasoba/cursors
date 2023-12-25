import * as PIXI from "pixi.js";
import { asset } from "$fresh/runtime.ts";
import seedrandom from "seedrandom";
import { BlockType, generate, Maze } from "./maze.ts";
import { Cursor } from "./Cursor.ts";
import { randomInt } from "../utils/randomInt.ts";
import { genSeed } from "../utils/genSeed.ts";
import { MazeStreamMessage } from "../routes/stream/[maze_seed].ts";

export interface MazeSceneOptions {
  app: PIXI.Application;
  seed: string;
}

const toEvenNumber = (n: number) => n - n % 2;

export const drawMaze = (
  walls: PIXI.Graphics,
  hints: PIXI.Graphics,
  maze: Maze,
  brickSize: number,
  fgColor: PIXI.Color,
) => {
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      const block = maze.field[y][x];

      switch (block) {
        case BlockType.Wall: {
          const rect = new PIXI.Rectangle(
            x * brickSize,
            y * brickSize,
            brickSize,
            brickSize,
          );

          walls.beginFill(fgColor);
          walls.drawShape(rect);
          walls.endFill();
          break;
        }

        case BlockType.Hint:
        case BlockType.None: {
          const rect = new PIXI.Rectangle(
            x * brickSize,
            y * brickSize,
            brickSize,
            brickSize,
          );

          if (x == maze.goalX && y == maze.goalY) {
            hints.beginFill(0xff0000);
            hints.drawShape(rect);
            hints.endFill();
          } else if (block == BlockType.Hint) {
            hints.beginFill(0xffff00);
            hints.drawShape(rect);
            hints.endFill();
          }

          break;
        }
      }
    }
  }
};

export function createMaze(
  seed: string,
  rng: () => number,
  brickSize: number,
  player: Cursor,
  app: PIXI.Application,
) {
  const hue = rng() * 360;

  const bgColor = new PIXI.Color({
    h: hue,
    s: 25,
    v: 80,
  });

  const fgColor = new PIXI.Color({
    h: hue,
    s: 80,
    v: 25,
  });

  const mazeWrapper = new PIXI.Container();
  mazeWrapper.sortableChildren = true;

  const mazeSize = toEvenNumber(randomInt(6, 96, () => rng())) - 1;
  const maze = generate(rng, mazeSize, mazeSize);

  player.sprite.zIndex = 2;
  player.sprite.x = maze.startX * brickSize + player.sprite.width / 2;
  player.sprite.y = maze.startY * brickSize + player.sprite.width / 2;

  const walls = new PIXI.Graphics();
  const hints = new PIXI.Graphics();

  walls.zIndex = 3;
  hints.zIndex = 0;

  drawMaze(walls, hints, maze, brickSize, fgColor);

  mazeWrapper.addChild(hints);
  mazeWrapper.addChild(player.sprite);
  mazeWrapper.addChild(walls);

  const ws = new WebSocket(
    new URL(`../stream/${seed}`, location.href).toString().replace(
      /^http/,
      "ws",
    ),
  );

  const ghosts = new Map<string, { cursor: Cursor; x: number; y: number }>();

  const getGhost = async (id: string) => {
    return ghosts.get(id) ?? await (async () => {
      const ghost = {
        cursor: await Cursor.create(),
        x: 1,
        y: 1,
      };

      ghost.cursor.sprite.zIndex = 1;
      ghost.cursor.sprite.alpha = 0.5;

      ghosts.set(id, ghost);

      mazeWrapper.addChild(ghost.cursor.sprite);

      return ghost;
    })();
  };

  ws.addEventListener("message", async (e) => {
    if (typeof e.data !== "string") return;

    const data: MazeStreamMessage = JSON.parse(e.data);

    if (data.type == "sync-pos") {
      const ghost = await getGhost(data.id);

      ghost.cursor.sprite.x = data.x;
      ghost.cursor.sprite.y = data.y;
    } else if (data.type == "exit") {
      const ghost = ghosts.get(data.id);

      if (ghost) {
        ghost.cursor.sprite.parent.removeChild(ghost.cursor.sprite);
        ghosts.delete(data.id);
      }
    }
  });

  return {
    bgColor,
    fgColor,
    player,
    stage: mazeWrapper,
    maze,
    walls,
    hints,
    socket: ws,
    dispose() {
      mazeWrapper.parent.removeChild(mazeWrapper);
      ws.send(JSON.stringify({
        type: "exit",
      }));
      ws.close();
    },
  };
}

export async function MazeScene({ app, seed }: MazeSceneOptions) {
  const brickSize = 64;

  const player = await Cursor.create();

  const view = app.view as HTMLCanvasElement;

  app.stage.sortableChildren = true;

  const scoreText = new PIXI.Text(
    `score: ${history.state.score ?? 0} cleared: ${history.state.room ?? 0}`,
    {
      fontSize: 24,
      fill: 0xffffff,
      align: "left",
    },
  );

  const redrawScoreText = () => {
    scoreText.text = `score: ${history.state.score ?? 0} cleared: ${
      history.state.room ?? 0
    }`;
  };

  scoreText.zIndex = 1;
  scoreText.x = 8;
  scoreText.y = 8;

  app.stage.addChild(scoreText);

  let rng = seedrandom(seed);
  let { stage, maze, bgColor, dispose: disposeMaze, socket, hints } = createMaze(
    seed,
    rng,
    brickSize,
    player,
    app,
  );

  app.renderer.background.color = bgColor;

  let prevPos = {
    x: player.sprite.x,
    y: player.sprite.y,
  };

  setInterval(() => {
    if (
      socket.readyState != 1 ||
      prevPos.x === player.sprite.x && prevPos.y === player.sprite.y
    ) return;

    socket.send(JSON.stringify({
      type: "sync-pos",
      x: player.sprite.x,
      y: player.sprite.y,
    }));

    prevPos = {
      x: player.sprite.x,
      y: player.sprite.y,
    };
  }, 1000 / 24);

  function move(moveX: number, moveY: number) {
    const nextX = player.sprite.x +
      Math.min(brickSize / 2, Math.max(-brickSize / 2, moveX));
    const nextY = player.sprite.y +
      Math.min(brickSize / 2, Math.max(-brickSize / 2, moveY));

    // 移動先が壁じゃないなら移動できる、簡素な処理

    const fieldX = Math.floor(
      (nextX + player.sprite.width / 2) / brickSize,
    );
    const fieldY = Math.floor(
      (nextY + player.sprite.height / 2) / brickSize,
    );

    if (maze.field[fieldY][fieldX] != BlockType.Wall) {
      player.sprite.x = nextX;
      player.sprite.y = nextY;
    }

    if (maze.field[fieldY][fieldX] == BlockType.Hint) {
      history.replaceState(
        {
          score: (history.state.score ?? 0) + 1,
          room: history.state.room ?? 0,
        },
        "",
      );

      redrawScoreText();

      maze.field[fieldY][fieldX] = BlockType.None;

      const rect = new PIXI.Rectangle(
        fieldX * brickSize,
        fieldY * brickSize,
        brickSize,
        brickSize,
      );

      hints.beginFill(0xdddddd);
      hints.drawShape(rect);
      hints.endFill();
    }

    // カメラ追尾の処理、デタラメ

    const w = (maze.width + 2) * brickSize;
    const h = (maze.height + 2) * brickSize;
    const x = player.sprite.x + player.sprite.width / 2;
    const y = player.sprite.y + player.sprite.height / 2;

    if (w <= app.screen.width) {
      stage.x = app.screen.width / 2 + w / 2;
    } else {
      stage.x = (x / w) * (app.screen.width - w);
    }

    if (h <= app.screen.height) {
      stage.y = app.screen.height / 2 + h / 2;
    } else {
      stage.y = (y / h) * (app.screen.height - h);
    }

    // ゴール時の処理

    if (fieldX == maze.goalX && fieldY == maze.goalY) {
      const seed = genSeed(rng);
      history.pushState(
        {
          score: (history.state.score ?? 0) + 10,
          room: (history.state.room ?? 0) + 1,
        },
        "",
        `/m/${seed}`,
      );

      redrawScoreText();

      rng = seedrandom(seed);

      disposeMaze();

      ({ stage, maze, bgColor, dispose: disposeMaze, socket, hints } = createMaze(
        seed,
        rng,
        brickSize,
        player,
        app,
      ));

      app.renderer.background.color = bgColor;

      app.stage.addChild(stage);
    }
  }

  view.addEventListener("mousemove", (e) => {
    move(e.movementX, e.movementY);
  });

  touchMove(view, move);

  view.addEventListener("click", () => {
    view.requestPointerLock();
  });

  app.stage.addChild(stage);
}

export function touchMove(
  view: HTMLCanvasElement,
  move: (x: number, y: number) => void,
) {
  let pos: null | { x: number; y: number } = {
    x: 0,
    y: 0,
  };

  view.addEventListener("touchstart", (e) => {
    pos = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  });

  view.addEventListener("touchend", (e) => {
    pos = null;
  });

  view.addEventListener("touchmove", (e) => {
    if (!pos) return;
    const moveX = (e.touches[0].clientX - pos.x) / 16;
    const moveY = (e.touches[0].clientY - pos.y) / 16;

    move(moveX, moveY);
  });
}
