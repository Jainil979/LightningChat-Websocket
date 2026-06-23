// lightningchat-ws/utils/binaryProtocol.js
import { encodeVarint, decodeVarint } from './varint.js';

export const TYPE_SUBSCRIBE = 0x01;
export const TYPE_PRESENCE  = 0x02;
export const TYPE_SIGNAL    = 0x03;
export const TYPE_RELAY     = 0x04;
export const TYPE_KEY_EXCHANGE_INIT  = 0x05;
export const TYPE_KEY_EXCHANGE_REPLY = 0x06;

// ---------- PRESENCE ----------
export function encodePresence(userId, online, lastSeen = null) {
  const idBytes = encodeVarint(userId);
  let totalLen = 2 + idBytes.length;
  const tsBytes = !online && lastSeen != null ? encodeVarint(lastSeen) : null;
  if (tsBytes) totalLen += tsBytes.length;
  const buf = Buffer.allocUnsafe(totalLen);
  let offset = 0;
  buf[offset++] = TYPE_PRESENCE;
  buf[offset++] = online ? 1 : 0;
  buf.set(idBytes, offset); offset += idBytes.length;
  if (tsBytes) buf.set(tsBytes, offset);
  return buf;
}

// ---------- SUBSCRIBE ----------
export function encodeSubscribe(userIds) {
  const count = userIds.length;
  let totalLen = 2;
  const encoded = userIds.map(id => {
    const enc = encodeVarint(id);
    totalLen += enc.length;
    return enc;
  });
  const buf = Buffer.allocUnsafe(totalLen);
  let offset = 0;
  buf[offset++] = TYPE_SUBSCRIBE;
  buf[offset++] = count;
  for (const enc of encoded) {
    buf.set(enc, offset);
    offset += enc.length;
  }
  return buf;
}

export function decodeSubscribePayload(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const count = buf[0];
  const ids = [];
  let offset = 1;
  for (let i = 0; i < count; i++) {
    const { value, length } = decodeVarint(buf, offset);
    ids.push(value);
    offset += length;
  }
  return ids;
}

// ---------- SIGNAL (unchanged) ----------
export function encodeSignalToTarget(targetUserId, subType, payloadUtf8) {
  const targetBytes = encodeVarint(targetUserId);
  const payloadBytes = Buffer.from(payloadUtf8, 'utf-8');
  const len = payloadBytes.length;
  const headerSize = 1 + targetBytes.length + 1 + 2;
  const buf = Buffer.allocUnsafe(headerSize + len);
  let offset = 0;
  buf[offset++] = TYPE_SIGNAL;
  buf.set(targetBytes, offset); offset += targetBytes.length;
  buf[offset++] = subType;
  buf[offset++] = (len >> 8) & 0xFF;
  buf[offset++] = len & 0xFF;
  buf.set(payloadBytes, offset);
  return buf;
}

export function decodeSignalFromClient(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let offset = 1;
  const { value: targetId, length: idLen } = decodeVarint(buf, offset);
  offset += idLen;
  const subType = buf[offset++];
  const payloadLen = (buf[offset] << 8) | buf[offset + 1];
  offset += 2;
  const payload = buf.slice(offset, offset + payloadLen).toString('utf-8');
  return { targetId, subType, payload };
}

export function encodeSignalToReceiver(senderUserId, subType, payloadUtf8) {
  const senderBytes = encodeVarint(senderUserId);
  const payloadBytes = Buffer.from(payloadUtf8, 'utf-8');
  const len = payloadBytes.length;
  const headerSize = 1 + senderBytes.length + 1 + 2;
  const buf = Buffer.allocUnsafe(headerSize + len);
  let offset = 0;
  buf[offset++] = TYPE_SIGNAL;
  buf.set(senderBytes, offset); offset += senderBytes.length;
  buf[offset++] = subType;
  buf[offset++] = (len >> 8) & 0xFF;
  buf[offset++] = len & 0xFF;
  buf.set(payloadBytes, offset);
  return buf;
}

// ---------- RELAY ----------
export function encodeRelayToTarget(targetUserId, encryptedPayload) {
  const targetBytes = encodeVarint(targetUserId);
  const buf = Buffer.allocUnsafe(1 + targetBytes.length + encryptedPayload.length);
  let offset = 0;
  buf[offset++] = TYPE_RELAY;
  buf.set(targetBytes, offset); offset += targetBytes.length;
  buf.set(encryptedPayload, offset);
  return buf;
}

export function decodeRelayFromClient(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let offset = 1;
  const { value: targetId, length: idLen } = decodeVarint(buf, offset);
  offset += idLen;
  const payload = buf.slice(offset);
  return { targetId, payload };
}

export function encodeRelayToReceiver(senderUserId, encryptedPayload) {
  const senderBytes = encodeVarint(senderUserId);
  const buf = Buffer.allocUnsafe(1 + senderBytes.length + encryptedPayload.length);
  let offset = 0;
  buf[offset++] = TYPE_RELAY;
  buf.set(senderBytes, offset); offset += senderBytes.length;
  buf.set(encryptedPayload, offset);
  return buf;
}

// ---------- KEY EXCHANGE (binary payload) ----------
export function encodeKeyExchangeToTarget(targetUserId, subType, payloadBytes) {
  const targetBytes = encodeVarint(targetUserId);
  const buf = Buffer.allocUnsafe(1 + targetBytes.length + payloadBytes.length);
  let offset = 0;
  buf[offset++] = subType;
  buf.set(targetBytes, offset); offset += targetBytes.length;
  buf.set(payloadBytes, offset);
  return buf;
}

export function decodeKeyExchangeFromClient(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let offset = 1;
  const { value: targetId, length: idLen } = decodeVarint(buf, offset);
  offset += idLen;
  const payload = buf.slice(offset);
  return { targetId, payload };
}

export function encodeKeyExchangeToReceiver(senderUserId, subType, payloadBytes) {
  const senderBytes = encodeVarint(senderUserId);
  const buf = Buffer.allocUnsafe(1 + senderBytes.length + payloadBytes.length);
  let offset = 0;
  buf[offset++] = subType;
  buf.set(senderBytes, offset); offset += senderBytes.length;
  buf.set(payloadBytes, offset);
  return buf;
}

// ---------- ACKS (updated for message IDs) ----------
export const TYPE_DELIVERY_ACK = 0x07;
export const TYPE_READ_ACK     = 0x08;

/**
 * Encode an ACK frame from client to server.
 * Layout: [type byte][varint targetUserId][2-byte length][UTF-8 msgId]
 */
export function encodeAckToTarget(targetUserId, ackType, msgId) {
  const targetBytes = encodeVarint(targetUserId);
  const msgBytes = Buffer.from(msgId, 'utf-8');
  const len = msgBytes.length;
  const buf = Buffer.allocUnsafe(1 + targetBytes.length + 2 + len);
  let offset = 0;
  buf[offset++] = ackType;
  buf.set(targetBytes, offset); offset += targetBytes.length;
  buf.writeUInt16BE(len, offset); offset += 2;
  buf.set(msgBytes, offset);
  return buf;
}

/**
 * Decode an ACK frame coming from a client.
 * Returns { targetId, ackType, msgId }
 */
export function decodeAckFromClient(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const ackType = buf[0];
  let offset = 1;
  const { value: targetId, length: idLen } = decodeVarint(buf, offset);
  offset += idLen;
  const payloadLen = buf.readUInt16BE(offset);
  offset += 2;
  const msgId = buf.slice(offset, offset + payloadLen).toString('utf-8');
  return { targetId, ackType, msgId };
}

/**
 * Build an ACK frame to forward to the receiver.
 * Layout: [type byte][varint senderUserId][2-byte length][UTF-8 msgId]
 */
export function encodeAckToReceiver(senderUserId, ackType, msgId) {
  const senderBytes = encodeVarint(senderUserId);
  const msgBytes = Buffer.from(msgId, 'utf-8');
  const len = msgBytes.length;
  const buf = Buffer.allocUnsafe(1 + senderBytes.length + 2 + len);
  let offset = 0;
  buf[offset++] = ackType;
  buf.set(senderBytes, offset); offset += senderBytes.length;
  buf.writeUInt16BE(len, offset); offset += 2;
  buf.set(msgBytes, offset);
  return buf;
}

// ---------- VIDEO CALL SIGNALS ----------
export const TYPE_VIDEO_SIGNAL = 0x10;
export const VIDEO_OFFER   = 0x01;
export const VIDEO_ANSWER  = 0x02;
export const VIDEO_ICE     = 0x03;
export const VIDEO_HANGUP  = 0x04;

export function encodeVideoSignalToTarget(targetUserId, subType, payloadUtf8) {
  const targetBytes = encodeVarint(targetUserId);
  const payloadBytes = Buffer.from(payloadUtf8, 'utf-8');
  const len = payloadBytes.length;
  const headerSize = 1 + targetBytes.length + 1 + 2;
  const buf = Buffer.allocUnsafe(headerSize + len);
  let offset = 0;
  buf[offset++] = TYPE_VIDEO_SIGNAL;
  buf.set(targetBytes, offset); offset += targetBytes.length;
  buf[offset++] = subType;
  buf[offset++] = (len >> 8) & 0xFF;
  buf[offset++] = len & 0xFF;
  buf.set(payloadBytes, offset);
  return buf;
}

export function decodeVideoSignalFromClient(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let offset = 1;
  const { value: targetId, length: idLen } = decodeVarint(buf, offset);
  offset += idLen;
  const subType = buf[offset++];
  const payloadLen = (buf[offset] << 8) | buf[offset + 1];
  offset += 2;
  const payload = buf.slice(offset, offset + payloadLen).toString('utf-8');
  return { targetId, subType, payload };
}

export function encodeVideoSignalToReceiver(senderUserId, subType, payloadUtf8) {
  const senderBytes = encodeVarint(senderUserId);
  const payloadBytes = Buffer.from(payloadUtf8, 'utf-8');
  const len = payloadBytes.length;
  const headerSize = 1 + senderBytes.length + 1 + 2;
  const buf = Buffer.allocUnsafe(headerSize + len);
  let offset = 0;
  buf[offset++] = TYPE_VIDEO_SIGNAL;
  buf.set(senderBytes, offset); offset += senderBytes.length;
  buf[offset++] = subType;
  buf[offset++] = (len >> 8) & 0xFF;
  buf[offset++] = len & 0xFF;
  buf.set(payloadBytes, offset);
  return buf;
}


export const TYPE_TYPING = 0x09;

export function encodeTypingToTarget(targetUserId) {
  const targetBytes = encodeVarint(targetUserId);
  const buf = Buffer.allocUnsafe(1 + targetBytes.length);
  buf[0] = TYPE_TYPING;
  buf.set(targetBytes, 1);
  return buf;
}

export function decodeTypingFromClient(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  let offset = 1;
  const { value: targetId, length } = decodeVarint(buf, offset);
  return { targetId };
}

export function encodeTypingToReceiver(senderUserId) {
  const senderBytes = encodeVarint(senderUserId);
  const buf = Buffer.allocUnsafe(1 + senderBytes.length);
  buf[0] = TYPE_TYPING;
  buf.set(senderBytes, 1);
  return buf;
}