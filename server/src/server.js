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
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // 1. Initialize Database
  await connectDB(env.mongoUri);

  // Streamlined index initialization - safely ignores idempotent duplicate errors
  const models = [Participant, Draw, Prize, Admin];
  await Promise.all(models.map((model) => model.init().catch(() => {})));

  await syncPrizes();

  // 2. Initialize Express App
  const app = createApp();

  // 3. Serve Compiled React Frontend
  // Auto-detect client folder (Vite uses 'dist', CRA uses 'build')
  const distPath = path.resolve(__dirname, "../../client/dist");
  const buildPath = path.resolve(__dirname, "../../client/build");
  const frontendPath = fs.existsSync(buildPath) ? buildPath : distPath;

  // Serve compiled React client files
  app.use(express.static(frontendPath));

  // Catch-all route to serve index.html (Express v5 syntax)
  app.get("/{*splat}", (req, res) => {
    const indexPath = path.join(frontendPath, "index.html");

    // Prevent server crash if Render fails to build the client
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res
        .status(404)
        .send(
          "Client build missing! Trigger a 'Clear build cache & deploy' in your Render dashboard.",
        );
    }
  });

  // 4. Start Server
  const server = app.listen(env.port, () => {
    console.log(`Kingsville API listening on :${env.port} (${env.nodeEnv})`);
  });

  // 5. Graceful shutdown handling
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
