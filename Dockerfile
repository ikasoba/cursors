FROM denoland/deno:1.38.4 AS build

WORKDIR /app
COPY . .
RUN deno task build

CMD deno run -A main.ts