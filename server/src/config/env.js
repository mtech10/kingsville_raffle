import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

const bool = (value, fallback = false) =>
  value === undefined || value === '' ? fallback : String(value).toLowerCase() === 'true';

const date = (name, fallback) => {
  const d = new Date(process.env[name] || fallback);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`${name} must be a valid ISO-8601 date, e.g. 2026-11-20T23:59:59+01:00`);
  }
  return d;
};

const jwtSecret =
  process.env.JWT_SECRET || (isProd ? '' : 'dev-only-insecure-secret-change-me-0123456789abcdef');

if (isProd && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to 32+ random characters in production.');
}

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kingsville_raffle',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
  serveClient: bool(process.env.SERVE_CLIENT, false),

  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  bcryptCost: Number(process.env.BCRYPT_COST) || 12,

  registrationDeadline: date('REGISTRATION_DEADLINE', '2026-11-20T23:59:59+01:00'),
  eventDate: date('EVENT_DATE', '2026-11-21T00:00:00+01:00'),
  allowDrawBeforeClose: bool(process.env.ALLOW_DRAW_BEFORE_CLOSE, false),

  email: Object.freeze({
    provider: (process.env.EMAIL_PROVIDER || 'mock').toLowerCase(),
    brevoApiKey: process.env.BREVO_API_KEY || '',
    fromEmail: process.env.BREVO_FROM_EMAIL || 'noreply@kingsvilleestate.com',
    fromName: process.env.BREVO_FROM_NAME || 'Kingsville Estate',
    codeTtlMinutes: Number(process.env.EMAIL_CODE_TTL_MINUTES) || 10,
  }),
});

export const isRegistrationOpen = (now = Date.now()) => now < env.registrationDeadline.getTime();
