import { serve } from "@hono/node-server";
import { resolve } from "node:path";
import { createApp } from "./app";

const dbPath = process.env.PENHUB_DB ?? resolve(process.cwd(), "penhub.db");
const app = createApp({ dbPath });

const demoDir = process.env.PENHUB_DEMO_DIR;
if (demoDir) {
  app.registerFolder("demo", resolve(demoDir));
}

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`penhub server listening on http://localhost:${info.port}`);
});
