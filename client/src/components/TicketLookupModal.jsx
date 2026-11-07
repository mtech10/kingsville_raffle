import { AlertCircle, Download, Loader2, Mail, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import Modal from './Modal';
import { downloadTicketImage } from './SuccessModal';

export default function TicketLookupModal({ open, onClose }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ticket, setTicket] = useState(null);

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setError('');
    setSubmitting(false);
    setTicket(null);
  }, [open]);

  async function handleLookup(e) {
    e.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter the email address you used to register.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const data = await api.lookupTicketByEmail(trimmed);
      setTicket(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'We could not find your ticket.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="ticket-lookup-title" size="md" dismissible={!submitting}>
      <div className="p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.25em] text-emerald-700/80">Ticket lookup</p>
            <h2 id="ticket-lookup-title" className="mt-2 font-display text-2xl font-bold text-emerald-950">Find your raffle ticket</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close lookup form" className="rounded-full p-2 text-emerald-900/60 transition hover:bg-emerald-900/5">
            <span aria-hidden="true">×</span>
          </button>
        </div>

        {!ticket ? (
          <form onSubmit={handleLookup} noValidate>
            <label htmlFor="lookup-email" className="mb-2 block text-sm font-semibold text-emerald-950">Email address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-700/60" aria-hidden="true" />
              <input
                id="lookup-email"
                type="email"
                autoComplete="email"
                data-autofocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="you@example.com"
                className="input pl-11"
              />
            </div>
            {error && (
              <p role="alert" className="mt-3 flex items-start gap-2 text-sm font-medium text-red-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <button type="submit" disabled={submitting} className="btn-gold mt-5 w-full py-3">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Looking up ticket…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Find my ticket
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 px-5 py-6 text-white shadow-xl ring-1 ring-gold-400/50">
              <p className="text-[11px] font-semibold uppercase tracking-[.2em] text-gold-300">Raffle number</p>
              <p className="gold-text mt-3 font-mono text-4xl font-bold tracking-wider sm:text-5xl">{ticket.ticketNumber}</p>
              <div className="my-4 border-t border-dashed border-white/25" />
              <p className="text-base font-semibold">{ticket.name}</p>
              <p className="mt-1 text-sm text-emerald-100/80">{ticket.email}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={() => downloadTicketImage(ticket)} className="btn-gold flex-1 py-3">
                <Download className="h-4 w-4" aria-hidden="true" />
                Download ticket
              </button>
              <button type="button" onClick={() => setTicket(null)} className="btn-outline flex-1 py-3">
                Look up another
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
