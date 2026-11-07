import mongoose from 'mongoose';

/**
 * Atomic sequence generator. `findOneAndUpdate({ _id: 'ticket' }, { $inc: { seq: 1 } })`
 * is a single atomic operation in MongoDB, so two simultaneous registrations can never
 * receive the same number.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
