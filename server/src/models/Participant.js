import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A registered raffle participant.
 *
 * Phone and email are unique to prevent duplicate entries. Pending registrations are kept until the
 * verification code is successfully confirmed and a ticket number is assigned.
 */
const participantSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    nameLower: { type: String, required: true },
    nameTokens: { type: [String], default: [] },

    phone: { type: String, required: true, match: /^0[789][01]\d{8}$/ },
    email: { type: String, required: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },

    status: { type: String, enum: ['pending_verification', 'eligible', 'won', 'disqualified'], default: 'pending_verification' },
    emailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null, maxlength: 4 },
    verificationCodeExpiresAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },

    ticketSeq: { type: Number, min: 1, default: undefined },
    ticketNumber: { type: String, default: undefined },

    prize: { type: Schema.Types.ObjectId, ref: 'Prize', default: null },
    prizeName: { type: String, default: null },
    wonAt: { type: Date, default: null },
    consentAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

participantSchema.index({ phone: 1 }, { unique: true, name: 'uniq_phone' });
participantSchema.index({ email: 1 }, { unique: true, name: 'uniq_email' });
participantSchema.index({ ticketSeq: 1 }, { unique: true, sparse: true, name: 'uniq_ticketSeq' });
participantSchema.index({ nameTokens: 1 }, { name: 'name_tokens' });
participantSchema.index({ nameLower: 1, ticketSeq: 1 }, { name: 'name_sort' });
participantSchema.index({ status: 1, ticketSeq: 1 }, { name: 'status_ticket' });
participantSchema.index({ status: 1, nameLower: 1, ticketSeq: 1 }, { name: 'status_name_sort' });
participantSchema.index({ createdAt: -1 }, { name: 'created_desc' });

export const Participant = mongoose.models.Participant || mongoose.model('Participant', participantSchema);
