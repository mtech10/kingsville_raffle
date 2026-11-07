import bcrypt from 'bcryptjs';
import { env, isRegistrationOpen } from '../config/env.js';
import { signAdminToken } from '../middleware/auth.js';
import { Admin } from '../models/Admin.js';
import { Draw } from '../models/Draw.js';
import { Participant } from '../models/Participant.js';
import { Prize } from '../models/Prize.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { fold } from '../utils/validation.js';

/* ----------------------------------------------------------------------------------------
 * Auth
 * ------------------------------------------------------------------------------------- */

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('kingsville-dummy-password', env.bcryptCost);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new HttpError(400, 'Email and password are required.');
  }

  const admin = await Admin.findOne({ email: email.trim().toLowerCase() }).lean();
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) throw new HttpError(401, 'Invalid email or password.');

  res.json({ token: signAdminToken(admin), admin: { email: admin.email } });
});

/* ----------------------------------------------------------------------------------------
 * Stats
 * ------------------------------------------------------------------------------------- */

export const getStats = asyncHandler(async (_req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [total, eligible, won, last24h, prizeTotals] = await Promise.all([
    Participant.countDocuments({}),
    Participant.countDocuments({ status: 'eligible' }), // status_ticket index
    Participant.countDocuments({ status: 'won' }),
    Participant.countDocuments({ createdAt: { $gte: since } }), // created_desc index
    Prize.aggregate([{ $group: { _id: null, total: { $sum: '$quantity' }, awarded: { $sum: '$awarded' } } }]),
  ]);

  res.json({
    totalRegistrations: total,
    eligible,
    winners: won,
    last24h,
    prizesTotal: prizeTotals[0]?.total ?? 0,
    prizesAwarded: prizeTotals[0]?.awarded ?? 0,
    registrationOpen: isRegistrationOpen(),
    registrationDeadline: env.registrationDeadline.toISOString(),
  });
});

/* ----------------------------------------------------------------------------------------
 * Participants: indexed search + sort + pagination
 *
 * Complexity: every query below is served by an index, so a page costs O(log n + limit) —
 * strictly better than the O(n log n) budget. The client never receives or sorts more than
 * `limit` (<= 100) rows; sorting is delegated to the index rather than re-done in JS.
 * ------------------------------------------------------------------------------------- */

// Whitelisted sort keys -> the indexed field behind them (prevents sorting on arbitrary/unindexed fields).
const SORT_FIELDS = { ticket: 'ticketSeq', name: 'nameLower', phone: 'phone', email: 'email' };
const STATUSES = new Set(['eligible', 'won', 'disqualified']);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Turns the search box into an index-friendly filter. All regexes are ANCHORED (^prefix),
 * which MongoDB executes as an index range scan rather than a collection scan.
 *   "KV-042" / "kv42"      -> exact ticketSeq
 *   digits                 -> phone prefix or a short ticket number
 *   email-like values      -> email prefix search
 *   words                  -> every word must prefix-match one of the participant's name words
 */
export function buildSearchFilter(raw) {
  const q = String(raw ?? '').trim().slice(0, 60);
  if (!q) return {};

  const ticket = /^kv[-\s]?(\d{1,9})$/i.exec(q);
  if (ticket) return { ticketSeq: Number(ticket[1]) };

  const digits = q.replace(/[\s+\-().]/g, '');
  if (/^\d+$/.test(digits)) {
    const phonePrefix = digits.startsWith('234') ? `0${digits.slice(3)}` : digits;
    const or = [{ phone: new RegExp(`^${phonePrefix}`) }];
    if (digits.length <= 6 && !digits.startsWith('0')) or.push({ ticketSeq: Number(digits) });
    return { $or: or };
  }

  if (q.includes('@')) {
    return { email: new RegExp(`^${escapeRegex(q.toLowerCase())}`) };
  }

  const words = fold(q).split(/[\s'’.\-]+/).filter(Boolean).slice(0, 4);
  if (!words.length) return {};
  return { $and: words.map((w) => ({ nameTokens: new RegExp(`^${escapeRegex(w)}`) })) };
}

function parseListQuery(query) {
  const str = (v) => (typeof v === 'string' ? v : '');
  const page = Math.max(1, parseInt(str(query.page), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(str(query.limit), 10) || 25));
  const sortKey = SORT_FIELDS[str(query.sort)] ? str(query.sort) : 'ticket';
  const dir = str(query.order) === 'desc' ? -1 : 1;
  const status = STATUSES.has(str(query.status)) ? str(query.status) : null;

  const filter = buildSearchFilter(str(query.q));
  if (status) filter.status = status;

  // nameLower is not unique, so add ticketSeq as a same-direction tiebreaker: stable pages AND still index-backed.
  const field = SORT_FIELDS[sortKey];
  const sort = field === 'nameLower' ? { nameLower: dir, ticketSeq: dir } : { [field]: dir };

  return { page, limit, sort, filter, sortKey, dir };
}

const LIST_PROJECTION = 'name phone email ticketNumber ticketSeq status prizeName wonAt createdAt';

export const listParticipants = asyncHandler(async (req, res) => {
  const { page, limit, sort, filter, sortKey, dir } = parseListQuery(req.query);

  const [rows, total] = await Promise.all([
    Participant.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(LIST_PROJECTION)
      .lean(),
    Object.keys(filter).length ? Participant.countDocuments(filter) : Participant.estimatedDocumentCount(),
  ]);

  res.json({
    data: rows.map(({ _id, ...rest }) => ({ id: String(_id), ...rest })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    sort: sortKey,
    order: dir === 1 ? 'asc' : 'desc',
  });
});

/* ----------------------------------------------------------------------------------------
 * CSV export — streams from a cursor, so memory stays flat no matter how many participants.
 * ------------------------------------------------------------------------------------- */

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csvText = (v) => `="${String(v ?? '').replace(/[^\d]/g, '')}"`;

export const exportParticipants = asyncHandler(async (req, res) => {
  const { filter } = parseListQuery(req.query);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="kingsville-participants.csv"');
  res.write('﻿'); // BOM so Excel reads UTF-8 names correctly
  res.write('Ticket,Name,Phone,Email,Status,Prize,Registered\r\n');

  const cursor = Participant.find(filter).sort({ ticketSeq: 1 }).select(LIST_PROJECTION).lean().cursor();
  for await (const p of cursor) {
    res.write(
      [
        csvCell(p.ticketNumber),
        csvCell(p.name),
        csvText(p.phone),
        csvCell(p.email),
        csvCell(p.status),
        csvCell(p.prizeName),
        csvCell(p.createdAt?.toISOString()),
      ].join(',') + '\r\n',
    );
  }
  res.end();
});

async function releasePrizeAwardForParticipant(participantId, prizeId) {
  if (!prizeId) return;
  await Promise.all([
    Prize.updateOne({ _id: prizeId, awarded: { $gt: 0 } }, { $inc: { awarded: -1 } }),
    Draw.deleteOne({ participant: participantId }),
  ]);
}

export const resetParticipantStatus = asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id).select('name status prize prizeName wonAt').lean();
  if (!participant) {
    throw new HttpError(404, 'Participant not found.', { code: 'PARTICIPANT_NOT_FOUND' });
  }

  await releasePrizeAwardForParticipant(req.params.id, participant.prize);

  const updated = await Participant.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        status: 'eligible',
        prize: null,
        prizeName: null,
        wonAt: null,
      },
    },
    { new: true, runValidators: true },
  ).select('name status ticketNumber');

  res.json({
    message: 'Participant status reset to eligible.',
    participant: { id: String(updated._id), name: updated.name, status: updated.status, ticketNumber: updated.ticketNumber },
  });
});

export const deleteParticipant = asyncHandler(async (req, res) => {
  const participant = await Participant.findById(req.params.id).select('prize').lean();
  if (!participant) {
    throw new HttpError(404, 'Participant not found.', { code: 'PARTICIPANT_NOT_FOUND' });
  }

  await releasePrizeAwardForParticipant(req.params.id, participant.prize);

  const result = await Participant.deleteOne({ _id: req.params.id });
  if (!result.deletedCount) {
    throw new HttpError(404, 'Participant not found.', { code: 'PARTICIPANT_NOT_FOUND' });
  }

  res.json({ message: 'Participant deleted.', deletedCount: result.deletedCount });
});

export const deleteAllParticipants = asyncHandler(async (_req, res) => {
  await Promise.all([
    Participant.deleteMany({}),
    Draw.deleteMany({}),
    Prize.updateMany({}, { $set: { awarded: 0 } }),
  ]);

  res.json({ message: 'Deleted all participants and cleared prize awards.', deletedCount: 0 });
});

export const resetAllParticipants = asyncHandler(async (_req, res) => {
  const [result, __] = await Promise.all([
    Participant.updateMany(
      {},
      {
        $set: {
          status: 'eligible',
          prize: null,
          prizeName: null,
          wonAt: null,
          emailVerified: true,
          verifiedAt: new Date(),
        },
      },
      { runValidators: true },
    ),
    Promise.all([
      Draw.deleteMany({}),
      Prize.updateMany({}, { $set: { awarded: 0 } }),
    ]),
  ]);

  res.json({
    message: `Reset ${result.modifiedCount} participants to eligible.`,
    modifiedCount: result.modifiedCount,
  });
});
