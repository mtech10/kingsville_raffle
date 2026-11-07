/**
 * Input normalisation + validation for the registration form.
 * Everything here is pure (no I/O) so it is trivial to unit-test.
 *
 * Normalising BEFORE the uniqueness check is what makes the phone rule strict:
 * "0803 123 4567", "+234 803 123 4567" and "2348031234567" all collapse to 08031234567.
 */

const NG_PHONE = /^0[789][01]\d{8}$/;
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lower-case and strip diacritics so "Adéọlá" and "adeola" compare equal. */
export const fold = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  let s = input.replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('00234')) s = `0${s.slice(5)}`;
  else if (s.startsWith('234')) s = `0${s.slice(3)}`;
  else if (/^[789][01]\d{8}$/.test(s)) s = `0${s}`;
  return NG_PHONE.test(s) ? s : null;
}

export function normalizeEmail(input) {
  if (typeof input !== 'string') return null;
  return input.trim().toLowerCase();
}

export function normalizeName(input) {
  if (typeof input !== 'string') return null;
  return input.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Unique, folded words of a name — stored in `nameTokens` for indexed prefix search. */
export function nameTokens(name) {
  return [...new Set(fold(name).split(/[\s'’.\-]+/).filter(Boolean))];
}

export const MESSAGES = Object.freeze({
  name: 'Enter your full name (first and last name).',
  phone: 'Enter a valid Nigerian phone number, e.g. 08012345678.',
  email: 'Enter a valid email address.',
  consent: 'You must confirm and consent to register.',
  phoneTaken: 'This phone number has already been used.',
  emailTaken: 'This email address has already been used.',
});

export function validateRegistration(body) {
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const errors = {};

  const name = normalizeName(src.name);
  if (!name || name.length < 3 || name.length > 80 || !NAME_RE.test(name) || name.split(' ').length < 2) {
    errors.name = MESSAGES.name;
  }

  const phone = normalizePhone(src.phone);
  if (!phone) errors.phone = MESSAGES.phone;

  const email = normalizeEmail(src.email);
  if (!email || !EMAIL_RE.test(email)) errors.email = MESSAGES.email;

  if (src.consent !== true) errors.consent = MESSAGES.consent;

  return { values: { name, phone, email }, errors };
}

/**
 * Loose name comparison against the names returned by the KYC provider.
 * Order-insensitive; passes when at least two words match (or every word, if fewer were given).
 */
export function namesMatch(submitted, recordParts) {
  const a = nameTokens(submitted);
  const b = new Set(recordParts.flatMap((part) => nameTokens(String(part || ''))));
  if (!a.length || !b.size) return false;
  const hits = a.filter((t) => b.has(t)).length;
  return hits >= Math.min(2, a.length);
}
