import { Counter } from '../models/Counter.js';
import { Participant } from '../models/Participant.js';

/**
 * Resyncs the counter with the largest ticket already issued, then returns the next number
 * in sequence. This guards against stale counters created before a reset, import, or a
 * previously failed write left the DB with a higher ticketSeq than the counter value.
 */
export async function syncTicketCounter() {
  const maxTicket = await Participant.findOne({ ticketSeq: { $exists: true, $ne: null } })
    .sort({ ticketSeq: -1 })
    .select('ticketSeq')
    .lean();

  const nextSeq = Math.max(0, maxTicket?.ticketSeq ?? 0);
  const counter = await Counter.findOneAndUpdate(
    { _id: 'ticket' },
    { $set: { seq: nextSeq } },
    { returnDocument: 'after', upsert: true },
  );

  return counter.seq;
}

/**
 * Atomically reserve the next ticket sequence number.
 *
 * `$inc` + `upsert` is one atomic server-side operation, so concurrent registrations always
 * receive distinct, strictly increasing numbers. The only race is two requests upserting the
 * very first counter document at the same instant; one gets E11000 and simply retries.
 *
 * Note: a number is "spent" even if the participant insert then fails (e.g. a duplicate-key race),
 * so in rare cases there can be a gap (KV-007 -> KV-009). Tickets stay unique; they are never reused.
 */
export async function nextTicketSeq() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const counter = await Counter.findOneAndUpdate(
        { _id: 'ticket' },
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true },
      );
      return counter.seq;
    } catch (err) {
      if (err?.code === 11000 && attempt < 2) continue;
      throw err;
    }
  }
  throw new Error('Could not allocate a ticket number');
}
