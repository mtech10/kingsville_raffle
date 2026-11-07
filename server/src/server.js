import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";
import { Admin } from "./models/Admin.js";
import { Draw } from "./models/Draw.js";
import { Participant } from "./models/Participant.js";
import { Prize } from "./models/Prize.js";
import { syncPrizes } from "./services/prizeService.js";

async function initDatabaseIndexes() {
  const models = [Participant, Draw, Prize, Admin];

  for (const model of models) {
    try {
      await model.init();
    } catch (err) {
      const isDuplicateIndexConflict =
        err?.code === 86 ||
        err?.codeName === "IndexKeySpecsConflict" ||
        /same name as the requested index/i.test(String(err?.message ?? ""));

      if (!isDuplicateIndexConflict) throw err;

      console.warn(
        `Ignoring existing duplicate index while initializing ${model.modelName}; the collection already has the required index.`,
      );
    }
  }
}

async function main() {
  await connectDB(env.mongoUri);

  // Wait for index builds: the UNIQUE indexes are what make duplicate registrations / double wins impossible,
  // so we must not accept traffic until they exist. If a previous process already created the exact index,
  // MongoDB may still reject the create attempt with code 86; treat that as a harmless idempotency race.
  await initDatabaseIndexes();
  await syncPrizes();

  if (env.isProd && env.email.provider === "mock") {
    console.warn(
      "⚠️  EMAIL_PROVIDER=mock in production: email verification codes are not being sent via Brevo.",
    );
  }

  const server = createApp().listen(env.port, () => {
    console.log(
      `Kingsville Estate API listening on :${env.port} (${env.nodeEnv}, email=${env.email.provider})`,
    );
  });

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
