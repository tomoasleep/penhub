import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { createApp } from "./app";

const app = createApp();

const demoDir = process.env.PENHUB_DEMO_DIR;
if (demoDir) {
  app.registerFolder("demo", resolve(demoDir));
}

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`penhub server listening on http://localhost:${info.port}`);
});
