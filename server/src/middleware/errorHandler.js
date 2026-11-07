import mongoose from 'mongoose';
import { HttpError } from '../utils/http.js';

export function notFound(_req, res) {
  res.status(404).json({ message: 'Not found.' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    // e.g. a CSV export that failed half-way: nothing sensible left to send.
    res.end();
    return;
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message, errors: err.errors, code: err.code });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Malformed JSON body.' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body too large.' });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(422).json({ message: 'Validation failed.', errors });
  }

  console.error('[unhandled]', err);
  return res.status(500).json({ message: 'Something went wrong on our side. Please try again.' });
}
