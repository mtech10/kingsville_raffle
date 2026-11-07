import { Check, Copy, Download, MessageCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Confetti from './Confetti';
import Modal from './Modal';

export function downloadTicketImage(ticket) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = 1200;
  const height = 720;
  canvas.width = width;
  canvas.height = height;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#062d26');
  bg.addColorStop(1, '#0a5c45');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 10; i += 1) {
    const x = 70 + i * 110;
    ctx.beginPath();
    ctx.arc(x, 120, 42, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 8; i += 1) {
    const y = 300 + i * 52;
    ctx.fillRect(62, y, 1076, 2);
  }

  const ticketX = 120;
  const ticketY = 120;
  const ticketW = 960;
  const ticketH = 480;
  const roundedRect = (x, y, w, h, radius) => {
    const r = Math.min(radius, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  roundedRect(ticketX, ticketY, ticketW, ticketH, 30);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();

  roundedRect(ticketX + 28, ticketY + 28, ticketW - 56, ticketH - 56, 24);
  ctx.fillStyle = 'rgba(10, 24, 20, 0.2)';
  ctx.fill();

  const left = ticketX + 62;
  const mid = ticketX + ticketW / 2;
  ctx.fillStyle = '#f6d97a';
  ctx.font = '600 26px Arial';
  ctx.fillText('RAFFLE TICKET', left, ticketY + 110);

  ctx.fillStyle = '#fff';
  ctx.font = '700 88px monospace';
  const numberText = ticket.ticketNumber || 'KV-000';
  const numberWidth = ctx.measureText(numberText).width;
  ctx.fillText(numberText, mid - numberWidth / 2, ticketY + 230);

  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = '600 46px Arial';
  const nameText = ticket.name || 'Registered Participant';
  ctx.fillText(nameText, left, ticketY + 322);

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.font = '500 26px Arial';
  ctx.fillText('Kingsville Estate · Live draw 21 Nov 2026', left, ticketY + 385);

  ctx.strokeStyle = 'rgba(246, 217, 122, 0.6)';
  ctx.lineWidth = 3;
  ctx.setLineDash([16, 14]);
  ctx.beginPath();
  ctx.moveTo(ticketX + 60, ticketY + ticketH - 90);
  ctx.lineTo(ticketX + ticketW - 60, ticketY + ticketH - 90);
  ctx.stroke();
  ctx.setLineDash([]);

  const fileName = `${(ticket.name || 'participant').trim().replace(/\s+/g, '-').toLowerCase()}-${(ticket.ticketNumber || 'ticket').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`;
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export default function SuccessModal({ open, ticket, onClose }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (open) setCopied(false);
  }, [open]);

  if (!ticket) return null;

  async function copyTicket() {
    try {
      await navigator.clipboard.writeText(ticket.ticketNumber);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = ticket.ticketNumber;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  const handleDownload = () => downloadTicketImage(ticket);
  const shareText = `I just registered for the Kingsville Estate launch raffle for a chance to win a 300sqm plot of land! Register here: ${window.location.origin}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <>
      <Modal open={open} onClose={onClose} labelledBy="success-title" size="md">
        <div className="px-6 pb-8 pt-10 text-center sm:px-8">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg viewBox="0 0 24 24" className="h-11 w-11 text-emerald-700" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeDasharray="40" style={{ animation: 'check-draw .6s .15s ease-out both' }} />
            </svg>
          </div>

          <h2 id="success-title" className="mt-5 font-display text-3xl font-bold text-emerald-950">
            You're in, {ticket.name.split(' ')[0]}!
          </h2>
          <p className="mt-2 text-emerald-900/75">Registration successful. Here is your unique raffle number.</p>

          {/* Ticket */}
          <div className="relative mx-auto mt-6 max-w-sm rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 px-6 py-7 text-white shadow-xl ring-1 ring-gold-400/50">
            <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" aria-hidden="true" />
            <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" aria-hidden="true" />
            <p className="text-[11px] font-semibold uppercase tracking-[.3em] text-gold-300">Raffle number</p>
            <p className="gold-text mt-2 font-mono text-5xl font-bold tracking-wider sm:text-6xl" aria-live="polite">
              {ticket.ticketNumber}
            </p>
            <div className="my-4 border-t border-dashed border-white/25" />
            <p className="text-sm text-emerald-100/90">{ticket.name}</p>
            <p className="mt-0.5 text-xs text-emerald-100/60">Kingsville Estate · Live draw 21 Nov 2026</p>
          </div>

          <p className="mt-5 text-sm text-emerald-900/70">Take a screenshot or copy your number and keep it safe. You will need it on draw day.</p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleDownload} className="btn-gold flex-1 py-3">
              <Download className="h-4 w-4" aria-hidden="true" />
              Download ticket
            </button>
            <button type="button" onClick={copyTicket} className="btn-outline flex-1 py-3">
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Copy number'}
            </button>
          </div>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="btn-outline mt-3 w-full py-3">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            Invite a friend
          </a>
          <button type="button" onClick={onClose} data-autofocus className="btn-gold mt-3 w-full">
            Done
          </button>
        </div>
      </Modal>
      {open && <Confetti />}
    </>
  );
}
