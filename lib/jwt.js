// lib/jwt.js
import { createVerifier } from 'fast-jwt';
import { JWT_SECRET } from '../config/env.js';

// Pre‑compiled verifier – the secret is a string, fast-jwt handles it
const verify = createVerifier({
  key: JWT_SECRET,
  algorithms: ['HS256'],          // enforce exactly this algorithm
  allowedIss: undefined,          // no issuer check
  allowedAud: undefined,
});

/**
 * Verify a WebSocket ticket JWT.
 * @returns {object|null} payload or null if invalid
 */
export function verifyTicket(token) {
  try {
    const payload = verify(token);   // throws if invalid
    if (payload.type !== 'ws_ticket') return null;
    return payload;                  // { userId, type, iat, exp }
  } catch {
    return null;
  }
}