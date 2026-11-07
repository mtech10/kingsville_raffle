import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  deleteAllParticipants,
  deleteParticipant,
  exportParticipants,
  getStats,
  listParticipants,
  login,
  resetAllParticipants,
  resetParticipantStatus,
} from '../controllers/adminController.js';
import { drawWinner, getDrawHistory, getDrawState } from '../controllers/drawController.js';
import { getPublicConfig, getTicketByEmail } from '../controllers/publicController.js';
import { register, verifyRegistration } from '../controllers/registerController.js';
import { requireAdmin } from '../middleware/auth.js';

const limiter = (limit, windowMs, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message },
  });

// Per-IP brakes. Registration is also protected by unique indexes; these just blunt scripted abuse.
const registerLimiter = limiter(15, 15 * 60 * 1000, 'Too many attempts. Please wait a few minutes and try again.');
const loginLimiter = limiter(10, 15 * 60 * 1000, 'Too many sign-in attempts. Please wait and try again.');

const router = Router();

/* ---- public ---- */
router.get('/config', getPublicConfig);
router.get('/ticket/:email', getTicketByEmail);
router.post('/register', registerLimiter, register);
router.post('/register/verify', registerLimiter, verifyRegistration);

/* ---- admin ---- */
router.post('/admin/login', loginLimiter, login);

const admin = Router();
admin.use(requireAdmin);
admin.get('/stats', getStats);
admin.get('/participants', listParticipants);
admin.delete('/participants', deleteAllParticipants);
admin.patch('/participants/reset-all', resetAllParticipants);
admin.get('/participants/export', exportParticipants);
admin.patch('/participants/:id/status', resetParticipantStatus);
admin.delete('/participants/:id', deleteParticipant);
admin.get('/draw/state', getDrawState);
admin.get('/draw/history', getDrawHistory);
admin.post('/draw', drawWinner);
router.use('/admin', admin);

export default router;
