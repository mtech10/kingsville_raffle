import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * Append-only audit log: one document per winner drawn.
 * The UNIQUE index on `participant` is a database-level guarantee that nobody can win twice,
 * even if application logic were ever bypassed.
 */
const drawSchema = new Schema(
  {
    prize: { type: Schema.Types.ObjectId, ref: 'Prize', required: true },
    prizeName: { type: String, required: true },
    participant: { type: Schema.Types.ObjectId, ref: 'Participant', required: true },
    ticketNumber: { type: String, required: true },
    winnerName: { type: String, required: true },
    poolSize: { type: Number, required: true },
    pickedIndex: { type: Number, required: true },
    method: { type: String, default: 'crypto.randomInt' },
    drawnBy: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

drawSchema.index({ participant: 1 }, { unique: true, name: 'uniq_winner' });
drawSchema.index({ createdAt: -1 });

export const Draw = mongoose.models.Draw || mongoose.model('Draw', drawSchema);
