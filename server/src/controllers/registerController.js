import { env, isRegistrationOpen } from '../config/env.js';
import { Participant } from '../models/Participant.js';
import { nextTicketSeq, syncTicketCounter } from '../services/ticketService.js';
import { EmailVerificationError, sendVerificationCode } from '../services/emailVerification.js';
import { asyncHandler, HttpError } from '../utils/http.js';
import { fold, MESSAGES, nameTokens, normalizeEmail, validateRegistration } from '../utils/validation.js';
import { formatTicket } from '../utils/ticket.js';

async function findDuplicateFields({ phone, email }) {
  const hits = await Participant.find({ $or: [{ phone }, { email }] })
    .select('phone email -_id')
    .limit(2)
    .lean();

  const dup = {};
  for (const hit of hits) {
    if (hit.phone === phone) dup.phone = MESSAGES.phoneTaken;
    if (hit.email === email) dup.email = MESSAGES.emailTaken;
  }
  return dup;
}

function inspectDuplicateKeyError(err) {
  if (err?.code !== 11000) return null;
  const keys = Object.keys(err.keyPattern || err.keyValue || {});
  const fields = {};
  if (keys.includes('phone')) fields.phone = MESSAGES.phoneTaken;
  if (keys.includes('email')) fields.email = MESSAGES.emailTaken;
  return { fields, ticketCollision: keys.includes('ticketSeq') };
}

export const register = asyncHandler(async (req, res) => {
  if (!isRegistrationOpen()) {
    throw new HttpError(403, 'Registration for the Kingsville Estate raffle has closed.', {
      code: 'REGISTRATION_CLOSED',
    });
  }

  const { values, errors } = validateRegistration(req.body);
  if (Object.keys(errors).length) {
    throw new HttpError(422, 'Please correct the highlighted fields.', { errors, code: 'VALIDATION' });
  }
  const { name, phone, email } = values;

  const duplicates = await findDuplicateFields({ phone, email });
  if (Object.keys(duplicates).length) {
    throw new HttpError(409, 'Some of these details have already been used.', {
      errors: duplicates,
      code: 'DUPLICATE',
    });
  }

  try {
    const verification = await sendVerificationCode({ name, email });
    const expiresAt = new Date(Date.now() + env.email.codeTtlMinutes * 60 * 1000);
    const existing = await Participant.findOne({ email }).lean();

    if (existing) {
      await Participant.findOneAndUpdate(
        { email },
        {
          $set: {
            name,
            nameLower: fold(name),
            nameTokens: nameTokens(name),
            phone,
            email,
            status: 'pending_verification',
            emailVerified: false,
            verificationCode: verification.code,
            verificationCodeExpiresAt: expiresAt,
            verifiedAt: null,
            ticketNumber: null,
            consentAt: null,
          },
          $unset: { ticketSeq: '', ticketNumber: '' },
        },
        { returnDocument: 'after' },
      );
    } else {
      await Participant.create({
        name,
        nameLower: fold(name),
        nameTokens: nameTokens(name),
        phone,
        email,
        status: 'pending_verification',
        emailVerified: false,
        verificationCode: verification.code,
        verificationCodeExpiresAt: expiresAt,
        consentAt: null,
      });
    }

    return res.status(201).json({
      message: 'Verification code sent. Check your email to complete registration.',
      email,
      requiresVerification: true,
    });
  } catch (err) {
    if (err instanceof EmailVerificationError) {
      throw new HttpError(503, 'Email verification is temporarily unavailable. Please try again in a few minutes.', {
        code: 'EMAIL_VERIFICATION_UNAVAILABLE',
      });
    }
    throw err;
  }
});

export const verifyRegistration = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const code = String(req.body?.code ?? '').trim();

  if (!email || !/^\d{4}$/.test(code)) {
    throw new HttpError(422, 'Please enter the 4-digit verification code sent to your email.', {
      errors: { code: 'Please enter the 4-digit verification code sent to your email.' },
      code: 'INVALID_VERIFICATION_CODE',
    });
  }

  const participant = await Participant.findOne({ email, status: 'pending_verification' });
  if (!participant) {
    throw new HttpError(404, 'We could not find an active verification session for this email.', {
      code: 'VERIFICATION_NOT_FOUND',
    });
  }

  if (!participant.verificationCode || !participant.verificationCodeExpiresAt) {
    throw new HttpError(422, 'This verification code is no longer valid. Please request a new one.', {
      code: 'CODE_EXPIRED',
    });
  }

  if (new Date() > participant.verificationCodeExpiresAt) {
    throw new HttpError(422, 'This verification code has expired. Please register again to receive a new one.', {
      code: 'CODE_EXPIRED',
    });
  }

  if (participant.verificationCode !== code) {
    throw new HttpError(422, 'Incorrect verification code. Please check the code in your email.', {
      errors: { code: 'Incorrect verification code. Please check the code in your email.' },
      code: 'INVALID_VERIFICATION_CODE',
    });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const ticketSeq = await nextTicketSeq();
    const ticketNumber = formatTicket(ticketSeq);

    try {
      const doc = await Participant.findOneAndUpdate(
        { _id: participant._id },
        {
          $set: {
            status: 'eligible',
            emailVerified: true,
            verificationCode: null,
            verificationCodeExpiresAt: null,
            verifiedAt: new Date(),
            ticketSeq,
            ticketNumber,
            consentAt: participant.consentAt ?? new Date(),
          },
        },
        { returnDocument: 'after' },
      );

      return res.status(201).json({
        message: 'Registration successful',
        ticketNumber: doc.ticketNumber,
        name: doc.name,
        registeredAt: doc.createdAt,
      });
    } catch (err) {
      const info = inspectDuplicateKeyError(err);
      if (!info) throw err;
      if (Object.keys(info.fields).length) {
        throw new HttpError(409, 'Some of these details have already been used.', {
          errors: info.fields,
          code: 'DUPLICATE',
        });
      }
      if (info.ticketCollision) {
        await syncTicketCounter();
        continue;
      }
      throw err;
    }
  }

  throw new HttpError(503, 'We could not generate your ticket. Please try again.', { code: 'TICKET_RETRY' });
});
