import mongoose from 'mongoose';

const prizeSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isGrand: { type: Boolean, default: false },
    drawOrder: { type: Number, required: true },
    quantity: { type: Number, default: 1, min: 1 },
    awarded: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false },
);

prizeSchema.index({ drawOrder: 1 });

export const Prize = mongoose.models.Prize || mongoose.model('Prize', prizeSchema);
