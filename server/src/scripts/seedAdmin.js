/**
 * Create or update the admin account.
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-passphrase' npm run seed:admin
 * (or set them in .env). Re-running with the same email resets that admin's password.
 */
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';

if (!email || password.length < 10) {
  console.error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 10 characters.');
  process.exit(1);
}

await connectDB(env.mongoUri);
await Admin.init();
const passwordHash = await bcrypt.hash(password, env.bcryptCost);
await Admin.findOneAndUpdate({ email }, { $set: { email, passwordHash } }, { upsert: true, returnDocument: 'after' });
console.log(`Admin ready: ${email}`);
await disconnectDB();
