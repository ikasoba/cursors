import { FreshContext } from "$fresh/server.ts";
import { $const, $number, $object, $string, Infer } from "lizod/";

export class MazeRoom {
  static generateId(): string {
    return crypto.randomUUID();
  }

  public clients = new Map<string, WebSocket>();

  constructor(public seed: string) {}

  addClient(ws: WebSocket, id = MazeRoom.generateId()) {
    this.clients.set(id, ws);

    return id;
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  async broadCast(message: string, sender?: WebSocket) {
    await Promise.all([...this.clients.values()].map((client) => {
      if (client == sender || client.readyState != 1) return;
      return client.send(message);
    }));
  }
}

const rooms = new Map<string, MazeRoom>();

export const isSyncPositionRequest = $object({
  type: $const("sync-pos"),
  x: $number,
  y: $number,
});

export const isExitCursorRequest = $object({
  type: $const("exit"),
});

export type MazeStreamMessage =
  | SyncPositionMessage
  | ExitCursorMessage;

export type SyncPositionMessage = {
  id: string;
  type: "sync-pos";
  x: number;
  y: number;
};

export type ExitCursorMessage = {
  id: string;
  type: "exit";
};

export const handler = (req: Request, ctx: FreshContext): Response => {
  if (req.headers.get("Upgrade") !== "websocket") {
    return new Response("invalid request", { status: 400 });
  }

  const seed = ctx.params.maze_seed.slice(0, 16).padStart(16, "0");

  const room = rooms.get(seed) ?? (() => {
    const room = new MazeRoom(seed);
    rooms.set(seed, room);

    return room;
  })();

  const { socket, response } = Deno.upgradeWebSocket(req);

  const id = room.addClient(socket);

  socket.addEventListener("close", async () => {
    await room.broadCast(
      JSON.stringify(
        {
          id: id,
          type: "exit",
        } satisfies ExitCursorMessage,
      ),
      socket,
    );

    room.removeClient(id);

    if (room.clients.size == 0) {
      rooms.delete(seed);
    }
  });

  socket.addEventListener("message", async (e) => {
    if (!(typeof e.data === "string")) return;

    try {
      const data: unknown = JSON.parse(e.data);

      if (isSyncPositionRequest(data)) {
        await room.broadCast(
          JSON.stringify(
            {
              id: id,
              type: "sync-pos",
              x: data.x,
              y: data.y,
            } satisfies SyncPositionMessage,
          ),
          socket,
        );
      } else if (isExitCursorRequest(data)) {
        await room.broadCast(
          JSON.stringify(
            {
              id: id,
              type: "exit",
            } satisfies ExitCursorMessage,
          ),
          socket,
        );
      }
    } catch {
      socket.close();
    }
  });

  return response;
};
