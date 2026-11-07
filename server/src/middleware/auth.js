import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export function signAdminToken(admin) {
  return jwt.sign({ sub: String(admin._id), email: admin.email }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

export function requireAdmin(req, _res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(new HttpError(401, 'Authentication required.'));

  try {
    const payload = jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
    req.admin = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(new HttpError(401, 'Your session has expired. Please sign in again.'));
  }
}
