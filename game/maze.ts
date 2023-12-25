export type Rng = () => number;

export enum BlockType {
  None,
  Wall,
  Hint,
}

enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export interface Maze {
  field: BlockType[][];
  width: number;
  height: number;
  startX: number;
  startY: number;
  goalX: number;
  goalY: number;
}

const randomInt = (r: Rng, max: number) => Math.floor(r() * max);

type Position = {
  x: number;
  y: number;
  max: number;
  r: Direction;
};

export function generate(random: Rng, width: number, height: number): Maze {
  const field = Array.from(
    { length: height },
    () => Array.from({ length: width }, () => BlockType.Wall),
  );

  const startX = 1;
  const startY = 1;

  const pos: Position = {
    x: startX,
    y: startY,
    max: 2,
    r: random() > 0.5 ? Direction.Right : Direction.Down,
  };

  field[startX][startY] = BlockType.None;

  // 適当にゴール地点を掘る
  const res = dig({
    random,
    pos,
    width,
    height,
    field,
  });

  const goalX = res.x;
  const goalY = res.y;

  const corners: { x: number; y: number }[] = res.corners;

  const roads = {
    goal: [...res.corners],
    normal: [] as { x: number; y: number }[],
  };

  while (corners.length) {
    const { x, y } = corners.splice(randomInt(random, corners.length), 1)[0];

    const pos = {
      x: x,
      y: y,
      max: 2,
      r: 0,
    };

    const dirs = getAvailableDirection(field, pos.x, pos.y);
    if (dirs.length == 0) continue;

    pos.r = dirs[randomInt(random, dirs.length)];

    const res = dig({
      random,
      width,
      height,
      field,
      pos,
    });

    corners.push(...res.corners);
    if (Math.random() > 0.5) {
      roads.normal.push(...res.corners);
    } else {
      roads.normal.unshift(...res.corners);
    }
  }

  for (let i = 0; i < 8; i++) {
    const corners = Math.random() < 0.65
      ? roads.goal.length ? roads.goal : roads.normal
      : roads.normal;
    if (corners.length == 0) break;

    const { x, y } =
      corners.splice(randomInt(Math.random, corners.length), 1)[0];

    field[y][x] = BlockType.Hint;
  }

  return {
    field,
    width,
    height,
    startX,
    startY,
    goalX,
    goalY,
  };
}

function isWallBlock(field: BlockType[][], x: number, y: number): boolean {
  return (field[y]?.[x] ?? BlockType.None) === BlockType.Wall;
}

interface MinerOption {
  random: Rng;
  width: number;
  height: number;
  field: BlockType[][];
  pos: Position;
}

function getAvailableDirection(field: BlockType[][], x: number, y: number) {
  const list: Set<Direction> = new Set();
  if (isWallBlock(field, x - 2, y)) {
    list.add(Direction.Right);
  }

  if (isWallBlock(field, x + 2, y)) {
    list.add(Direction.Right);
  }

  if (isWallBlock(field, x, y - 2)) {
    list.add(Direction.Up);
  }

  if (isWallBlock(field, x, y + 2)) {
    list.add(Direction.Down);
  }

  return [...list];
}

function dig({ random, width, height, field, pos }: MinerOption) {
  const corners: { x: number; y: number }[] = [];

  let i = 99999;
  while (i--) {
    corners.push({
      x: pos.x,
      y: pos.y,
    });

    const res = step({
      random,
      width,
      height,
      field,
      pos: { ...pos },
    });

    if (res.movement == 0) break;

    pos = {
      x: res.x,
      y: res.y,
      max: 2,
      r: 0,
    };

    const dirs = getAvailableDirection(field, pos.x, pos.y);
    if (dirs.length == 0) break;

    pos.r = dirs[randomInt(random, dirs.length)];
  }

  return {
    x: pos.x,
    y: pos.y,
    corners: corners,
  };
}

function step({ random, width, height, field, pos }: MinerOption) {
  let movement = 0;
  while (true) {
    if (
      pos.max <= 0 || pos.x < 0 || pos.y < 0 || pos.x >= width ||
      pos.y >= height
    ) {
      break;
    }

    const moveX = pos.r == Direction.Left
      ? -1
      : pos.r == Direction.Right
      ? 1
      : 0;

    const moveY = pos.r == Direction.Up ? -1 : pos.r == Direction.Down ? 1 : 0;

    let tmp = field[pos.y + moveY * 2]?.[pos.x + moveX * 2] ?? BlockType.None;
    if (tmp != BlockType.Wall) break;

    const nextX = pos.x + moveX;
    const nextY = pos.y + moveY;
    if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
      break;
    }

    field[nextY][nextX] = BlockType.None;
    pos.max -= 1;
    movement += 1;

    pos.x = nextX;
    pos.y = nextY;
  }

  return {
    movement,
    x: Math.max(0, Math.min(width, pos.x)),
    y: Math.max(0, Math.min(height, pos.y)),
  };
}
