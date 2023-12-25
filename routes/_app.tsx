import { type PageProps } from "$fresh/server.ts";
import { asset } from "$fresh/runtime.ts";

export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>cursors</title>
        <link rel="stylesheet" href={asset("/styles.css")} />
        <link rel="icon" href={asset("/cursor.svg")} />
        <link rel="apple-touch-icon" href={asset("/app-icon.svg")} />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
