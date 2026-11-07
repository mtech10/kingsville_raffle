export const maskPhone = (p = '') => (p.length >= 8 ? `${p.slice(0, 4)} ••• ${p.slice(-4)}` : p);
export const maskEmail = (email = '') => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.length > 2 ? `${local.slice(0, 2)}•••` : `${local.slice(0, 1)}•`;
  return `${visible}@${domain}`;
};

const NG = 'en-NG';

export const formatDateLong = (d) =>
  new Intl.DateTimeFormat(NG, { dateStyle: 'full', timeZone: 'Africa/Lagos' }).format(new Date(d));

export const formatDateTime = (d) =>
  d
    ? new Intl.DateTimeFormat(NG, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(d))
    : '—';

export const formatNumber = (n) => new Intl.NumberFormat(NG).format(n ?? 0);
