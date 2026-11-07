// Mirrors server/src/utils/validation.js so users get instant feedback.
// The server re-validates everything: never trust this file for security.

export function normalizePhone(input) {
  let s = String(input ?? '').replace(/[\s\-().]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('00234')) s = `0${s.slice(5)}`;
  else if (s.startsWith('234')) s = `0${s.slice(3)}`;
  else if (/^[789][01]\d{8}$/.test(s)) s = `0${s}`;
  return /^0[789][01]\d{8}$/.test(s) ? s : null;
}

export function normalizeEmail(input) {
  return String(input ?? '').trim().toLowerCase();
}

export const validators = {
  name: (v) => {
    const s = String(v ?? '').replace(/\s+/g, ' ').trim();
    const ok = s.length >= 3 && s.length <= 80 && /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u.test(s) && s.split(' ').length >= 2;
    return ok ? '' : 'Enter your full name (first and last name).';
  },
  phone: (v) => (normalizePhone(v) ? '' : 'Enter a valid Nigerian phone number, e.g. 08012345678.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(v)) ? '' : 'Enter a valid email address.'),
  consent: (v) => (v ? '' : 'You must confirm and consent to register.'),
};

export function validateAll(values) {
  const errors = {};
  for (const key of Object.keys(validators)) {
    const msg = validators[key](values[key]);
    if (msg) errors[key] = msg;
  }
  return errors;
}
