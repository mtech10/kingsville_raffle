import { PRIZES } from '../config/prizes.js';
import { Prize } from '../models/Prize.js';

/** Upsert the prize catalogue from config. Never touches the `awarded` counters. */
export async function syncPrizes() {
  await Prize.bulkWrite(
    PRIZES.map((p) => ({
      updateOne: {
        filter: { key: p.key },
        update: {
          $set: {
            name: p.name,
            isGrand: Boolean(p.isGrand),
            drawOrder: p.drawOrder,
            quantity: p.quantity,
          },
          $setOnInsert: { awarded: 0 },
        },
        upsert: true,
      },
    })),
  );
}
