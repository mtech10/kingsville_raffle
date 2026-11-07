import { randomInt } from 'node:crypto';
import mongoose from 'mongoose';
import { env, isRegistrationOpen } from '../config/env.js';
import { Counter } from '../models/Counter.js';
import { Draw } from '../models/Draw.js';
import { Participant } from '../models/Participant.js';
import { Prize } from '../models/Prize.js';
import { asyncHandler, HttpError } from '../utils/http.js';

const MAX_CLAIM_ATTEMPTS = 5;

function drawBlockedReason() {
  if (!env.allowDrawBeforeClose && isRegistrationOpen()) {
    return 'Registration is still open. The draw unlocks once registration closes.';
  }
  return null;
}

const presentPrize = (p) => ({
  id: String(p._id),
  key: p.key,
  name: p.name,
  isGrand: p.isGrand,
  quantity: p.quantity,
  awarded: p.awarded,
  remaining: Math.max(0, p.quantity - p.awarded),
});

/** GET /api/admin/draw/state — everything the Live Draw stage needs in one round trip. */
export const getDrawState = asyncHandler(async (_req, res) => {
  const [prizes, eligibleCount, counter] = await Promise.all([
    Prize.find().sort({ drawOrder: 1 }).lean(),
    Participant.countDocuments({ status: 'eligible' }),
    Counter.findById('ticket').lean(),
  ]);

  const list = prizes.map(presentPrize);
  const next = list.find((p) => p.remaining > 0);
  const blockedReason = drawBlockedReason();

  res.json({
    prizes: list,
    nextPrizeId: next?.id ?? null,
    eligibleCount,
    ticketDigits: Math.max(3, String(counter?.seq ?? 0).length),
    canDraw: !blockedReason && eligibleCount > 0 && Boolean(next),
    blockedReason,
  });
});

/** GET /api/admin/draw/history — newest first. */
export const getDrawHistory = asyncHandler(async (_req, res) => {
  const draws = await Draw.find()
    .sort({ createdAt: -1 })
    .limit(500)
    .populate('participant', 'phone name ticketNumber')
    .lean();

  res.json({
    data: draws.map((d) => ({
      id: String(d._id),
      prizeName: d.prizeName,
      ticketNumber: d.ticketNumber,
      winnerName: d.winnerName,
      phone: d.participant?.phone ?? null,
      poolSize: d.poolSize,
      drawnBy: d.drawnBy,
      drawnAt: d.createdAt,
    })),
  });
});

/**
 * POST /api/admin/draw   { prizeId }
 *
 * Fairness
 *  - `crypto.randomInt(0, n)` is a CSPRNG with rejection sampling: uniform, no modulo bias,
 *    and not predictable from earlier results (unlike Math.random()).
 *  - The winner is chosen on the SERVER; the browser only animates a result it is handed.
 *
 * "Cannot win twice" — three independent layers
 *  1. Only `status: 'eligible'` participants are in the pool, and the claim below is a conditional
 *     update (`{ _id, status: 'eligible' } -> won`), so two concurrent draws can never claim the same person.
 *  2. The prize slot is reserved atomically first (`awarded < quantity` -> `$inc`), so a prize can't be over-awarded.
 *  3. A UNIQUE index on Draw.participant makes a duplicate win impossible at the database level.
 *
 * Cost: one count + one indexed skip/limit(1) + one conditional update — O(n) worst case for the skip
 * over an index (microseconds-to-milliseconds for any realistic raffle), and no full-collection load.
 */
export const drawWinner = asyncHandler(async (req, res) => {
  const { prizeId } = req.body || {};
  if (typeof prizeId !== 'string' || !mongoose.isValidObjectId(prizeId)) {
    throw new HttpError(400, 'Choose a valid prize to draw for.');
  }

  const blocked = drawBlockedReason();
  if (blocked) throw new HttpError(409, blocked, { code: 'DRAW_LOCKED' });

  // 1) Reserve a prize slot atomically.
  const prize = await Prize.findOneAndUpdate(
    { _id: prizeId, $expr: { $lt: ['$awarded', '$quantity'] } },
    { $inc: { awarded: 1 } },
    { returnDocument: 'after' },
  ).lean();

  if (!prize) {
    const exists = await Prize.exists({ _id: prizeId });
    throw new HttpError(exists ? 409 : 404, exists ? 'This prize has already been fully awarded.' : 'Prize not found.', {
      code: exists ? 'PRIZE_EXHAUSTED' : 'NOT_FOUND',
    });
  }

  let winner = null;
  let poolSize = 0;
  let pickedIndex = -1;

  try {
    for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS && !winner; attempt++) {
      poolSize = await Participant.countDocuments({ status: 'eligible' });
      if (poolSize === 0) throw new HttpError(409, 'There are no eligible participants left to draw from.', { code: 'EMPTY_POOL' });

      pickedIndex = randomInt(0, poolSize); // uniform in [0, poolSize)

      const [candidate] = await Participant.find({ status: 'eligible' })
        .sort({ ticketSeq: 1 }) // status_ticket index: stable order for skip()
        .skip(pickedIndex)
        .limit(1)
        .select('_id')
        .lean();
      if (!candidate) continue; // pool shrank between count and find — draw again

      winner = await Participant.findOneAndUpdate(
        { _id: candidate._id, status: 'eligible' },
        { $set: { status: 'won', prize: prize._id, prizeName: prize.name, wonAt: new Date() } },
        { returnDocument: 'after' },
      ).lean();
      // null here means a concurrent draw claimed them first -> loop and draw again
    }

    if (!winner) throw new HttpError(503, 'The draw is busy. Please press Draw again.', { code: 'DRAW_BUSY' });
  } catch (err) {
    // Nobody was awarded: release the prize slot we reserved.
    await Prize.updateOne({ _id: prize._id, awarded: { $gt: 0 } }, { $inc: { awarded: -1 } });
    throw err;
  }

  // Audit trail. The participant document is already the source of truth, so a logging failure must not undo a draw.
  try {
    await Draw.create({
      prize: prize._id,
      prizeName: prize.name,
      participant: winner._id,
      ticketNumber: winner.ticketNumber,
      winnerName: winner.name,
      poolSize,
      pickedIndex,
      drawnBy: req.admin.email,
    });
  } catch (err) {
    console.error('[draw] audit log failed for', winner.ticketNumber, err.message);
  }

  res.status(201).json({
    winner: {
      id: String(winner._id),
      name: winner.name,
      phone: winner.phone,
      ticketNumber: winner.ticketNumber,
      ticketSeq: winner.ticketSeq,
    },
    prize: presentPrize(prize),
    poolSize,
    drawnAt: winner.wonAt,
  });
});
