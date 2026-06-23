// handlers/upgradeHandler.js
import { verifyTicket } from '../lib/jwt.js';

export function handleUpgrade(res, req, context) {
  const query = req.getQuery();
  const params = new URLSearchParams(query || '');
  const ticket = params.get('ticket');

  if (!ticket) {
    return res.writeStatus('401').end('missing ticket');
  }

  const payload = verifyTicket(ticket);
  if (!payload) {
    return res.writeStatus('401').end('invalid ticket');
  }

  // payload.userId is a number (fast-jwt decodes numeric claims as numbers)
  res.upgrade(
    { userId: Number(payload.userId) },
    req.getHeader('sec-websocket-key'),
    req.getHeader('sec-websocket-protocol') || '',
    req.getHeader('sec-websocket-extensions') || '',
    context
  );
}