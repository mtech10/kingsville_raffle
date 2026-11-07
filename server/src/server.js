import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { Admin } from "./models/Admin.js";
import { Draw } from "./models/Draw.js";
import { Participant } from "./models/Participant.js";
import { Prize } from "./models/Prize.js";
import { syncPrizes } from "./services/prizeService.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  await connectDB(env.mongoUri);

  // Streamlined index initialization - safely ignores idempotent duplicate errors
  const models = [Participant, Draw, Prize, Admin];
  await Promise.all(models.map((model) => model.init().catch(() => {})));

  await syncPrizes();

  const app = createApp();

  // Serve compiled React frontend files for unified deployment
  app.use(express.static(path.join(__dirname, "../../frontend/dist")));

  // Catch-all route to serve index.html (Express v5 syntax)
  app.get("/{*splat}", (req, res) => {
    res.sendFile(
      path.resolve(__dirname, "../../frontend", "dist", "index.html"),
    );
  });

  const server = app.listen(env.port, () => {
    console.log(`Kingsville API listening on :${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown handling
  const shutdown = (signal) => {
    console.log(`\n${signal} received, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
