// Fallbacks used only until /api/config responds. The server's values always win.
export const SITE = {
  name: 'Kingsville Estate',
  eventDate: import.meta.env.VITE_EVENT_DATE || '2026-11-21T00:00:00+01:00',
  registrationDeadline: import.meta.env.VITE_REGISTRATION_DEADLINE || '2026-11-20T23:59:59+01:00',
};
