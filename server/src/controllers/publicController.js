import { env, isRegistrationOpen } from '../config/env.js';
import { Participant } from '../models/Participant.js';
import { HttpError, asyncHandler } from '../utils/http.js';
import { normalizeEmail } from '../utils/validation.js';

// The landing page can be hit by thousands of visitors: cache the count for a few seconds.
let cached = { at: 0, total: 0 };
const TTL_MS = 15_000;

async function totalRegistered() {
  if (Date.now() - cached.at > TTL_MS) {
    cached = { at: Date.now(), total: await Participant.estimatedDocumentCount() };
  }
  return cached.total;
}

/** GET /api/config — everything the landing page needs; `serverTime` lets the client correct clock skew. */
export const getPublicConfig = asyncHandler(async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    registrationDeadline: env.registrationDeadline.toISOString(),
    eventDate: env.eventDate.toISOString(),
    registrationOpen: isRegistrationOpen(),
    serverTime: new Date().toISOString(),
    totalRegistered: await totalRegistered(),
  });
});

export const getTicketByEmail = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.params?.email || req.body?.email || '');
  if (!email) {
    throw new HttpError(400, 'Please enter the email address you used to register.', {
      code: 'INVALID_EMAIL',
    });
  }

  const participant = await Participant.findOne({ email, status: 'eligible' })
    .select('name email ticketNumber ticketSeq verifiedAt createdAt')
    .lean();

  if (!participant) {
    throw new HttpError(404, 'We could not find a raffle ticket for that email address.', {
      code: 'TICKET_NOT_FOUND',
    });
  }

  res.json({
    name: participant.name,
    email: participant.email,
    ticketNumber: participant.ticketNumber,
    ticketSeq: participant.ticketSeq,
    verifiedAt: participant.verifiedAt,
    registeredAt: participant.createdAt,
  });
});
