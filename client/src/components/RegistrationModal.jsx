import { AlertCircle, CalendarDays, Gift, Landmark, Loader2, Mail, Phone, ShieldCheck, User, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { validateAll, validators } from '../lib/validation';
import Modal from './Modal';

const EMPTY = { name: '', phone: '', email: '', consent: false, code: '' };
const ORDER = ['name', 'phone', 'email', 'consent'];

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-red-600">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function Field({ id, label, icon: Icon, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-emerald-950">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/60" aria-hidden="true" />
        {children}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-emerald-900/60">{hint}</p>}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export default function RegistrationModal({ open, onClose, onSuccess }) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState('register');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const refs = { name: useRef(null), phone: useRef(null), email: useRef(null), consent: useRef(null), code: useRef(null) };

  useEffect(() => {
    if (open) {
      setValues(EMPTY);
      setErrors({});
      setFormError('');
      setSubmitting(false);
      setPhase('register');
      setRegisteredEmail('');
    }
  }, [open]);

  const setField = (key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: '' } : e));
    setFormError('');
  };

  const onBlur = (key) => {
    if (values[key] === '' || values[key] === false) return;
    const msg = validators[key](values[key]);
    if (msg) setErrors((e) => ({ ...e, [key]: msg }));
  };

  const focusFirstError = (errs) => {
    const key = ORDER.find((k) => errs[k]);
    if (key) refs[key].current?.focus();
  };

  async function handleRegister(e) {
    e.preventDefault();
    if (submitting) return;

    const clientErrors = validateAll({ name: values.name, phone: values.phone, email: values.email, consent: values.consent });
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      focusFirstError(clientErrors);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const data = await api.register({
        name: values.name,
        phone: values.phone,
        email: values.email,
        consent: values.consent,
      });
      setRegisteredEmail(values.email);
      setPhase('verify');
      setValues((v) => ({ ...v, code: '' }));
      setErrors({});
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors((prev) => ({ ...prev, ...err.errors }));
        focusFirstError(err.errors);
      } else {
        setFormError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (submitting) return;

    const code = values.code.trim();
    if (!/^\d{4}$/.test(code)) {
      setErrors({ code: 'Enter the 4-digit code sent to your email.' });
      refs.code.current?.focus();
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const data = await api.verifyRegistration({ email: registeredEmail, code });
      onSuccess(data);
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setErrors((prev) => ({ ...prev, ...err.errors }));
        refs.code.current?.focus();
      } else {
        setFormError(err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = (key) => `input pl-11 ${errors[key] ? 'input-error' : ''}`;
  const describe = (key) => (errors[key] ? `${key}-error` : undefined);

  const onSubmit = phase === 'register' ? handleRegister : handleVerify;

  return (
    <Modal open={open} onClose={onClose} labelledBy="register-title" size="xl" dismissible={!submitting}>
      <button type="button" onClick={onClose} disabled={submitting} aria-label="Close registration form" className="absolute right-3 top-3 z-10 rounded-full p-2 text-emerald-900/70 transition hover:bg-emerald-900/10 disabled:opacity-40 md:text-white/80 md:hover:bg-white/10">
        <X className="h-5 w-5" />
      </button>

      <div className="grid md:grid-cols-5">
        <aside className="bg-estate relative hidden flex-col justify-between p-8 text-white md:col-span-2 md:flex">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-gold-300">Launch raffle draw</p>
            <h3 className="mt-3 font-display text-3xl font-bold leading-tight">Your chance to win a <span className="gold-text">plot of land</span></h3>
          </div>
          <ul className="mt-8 space-y-4 text-sm text-emerald-50/90">
            <li className="flex gap-3"><Landmark className="h-5 w-5 shrink-0 text-gold-300" aria-hidden="true" />300sqm Area of Land, the Grand Prize</li>
            <li className="flex gap-3"><Gift className="h-5 w-5 shrink-0 text-gold-300" aria-hidden="true" />Nine more premium home prizes</li>
            <li className="flex gap-3"><CalendarDays className="h-5 w-5 shrink-0 text-gold-300" aria-hidden="true" />Live draw on 21 November 2026</li>
            <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-gold-300" aria-hidden="true" />One entry per person. Phone number and email must be unique.</li>
          </ul>
        </aside>

        <form onSubmit={onSubmit} noValidate className="p-6 sm:p-8 md:col-span-3 md:p-10">
          <h2 id="register-title" className="pr-8 font-display text-2xl font-bold text-emerald-950 sm:text-3xl">
            {phase === 'register' ? 'Register for the Raffle' : 'Verify your email'}
          </h2>
          <p className="mt-1.5 text-sm text-emerald-900/70">
            {phase === 'register'
              ? 'Enter your name, phone number and email. We will send a 4-digit code for verification.'
              : `We just sent a 4-digit code to ${registeredEmail}. Enter it below to finish registration.`}
          </p>

          <div className="mt-6 space-y-5">
            {phase === 'register' ? (
              <>
                <Field id="name" label="Full name" icon={User} error={errors.name}>
                  <input ref={refs.name} id="name" data-autofocus type="text" autoComplete="name" placeholder="e.g. Adaeze Okafor" value={values.name} onChange={(e) => setField('name', e.target.value)} onBlur={() => onBlur('name')} aria-invalid={Boolean(errors.name)} aria-describedby={describe('name')} className={inputClass('name')} />
                </Field>

                <Field id="phone" label="Phone number" icon={Phone} error={errors.phone} hint="Nigerian number, e.g. 0801 234 5678 or +234 801 234 5678">
                  <input ref={refs.phone} id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="08012345678" value={values.phone} onChange={(e) => setField('phone', e.target.value)} onBlur={() => onBlur('phone')} aria-invalid={Boolean(errors.phone)} aria-describedby={describe('phone')} className={inputClass('phone')} />
                </Field>

                <Field id="email" label="Email address" icon={Mail} error={errors.email} hint="A verification code will be sent here.">
                  <input ref={refs.email} id="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={(e) => setField('email', e.target.value)} onBlur={() => onBlur('email')} aria-invalid={Boolean(errors.email)} aria-describedby={describe('email')} className={inputClass('email')} />
                </Field>

                <div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm text-emerald-950/80">
                    <input ref={refs.consent} type="checkbox" checked={values.consent} onChange={(e) => setField('consent', e.target.checked)} aria-invalid={Boolean(errors.consent)} aria-describedby={describe('consent')} className="mt-0.5 h-5 w-5 shrink-0 rounded border-emerald-900/30 accent-emerald-700" />
                    <span>I confirm these details are mine and consent to Kingsville Estate processing them for this raffle.</span>
                  </label>
                  <FieldError id="consent-error" message={errors.consent} />
                </div>
              </>
            ) : (
              <Field id="code" label="Verification code" icon={Mail} error={errors.code} hint="Enter the 4-digit code from your email.">
                <input ref={refs.code} id="code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} placeholder="1234" value={values.code} onChange={(e) => setField('code', e.target.value.replace(/\D/g, '').slice(0, 4))} aria-invalid={Boolean(errors.code)} aria-describedby={describe('code')} className={`${inputClass('code')} tracking-[0.5em]`} />
              </Field>
            )}
          </div>

          {formError && (
            <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {formError}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-gold mt-6 w-full py-3.5 text-base">
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                {phase === 'register' ? 'Sending verification code…' : 'Verifying and registering…'}
              </>
            ) : (
              phase === 'register' ? 'Send verification code' : 'Verify and register'
            )}
          </button>

          {phase === 'verify' && (
            <button type="button" onClick={() => { setErrors({}); setFormError(''); setValues((v) => ({ ...v, code: '' })); setPhase('register'); }} className="mt-3 w-full text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">
              Use a different email
            </button>
          )}
        </form>
      </div>
    </Modal>
  );
}
