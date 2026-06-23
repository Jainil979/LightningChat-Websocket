// utils/varint.js
// Arithmetic varint – supports up to Number.MAX_SAFE_INTEGER (9 quadrillion)
// Works for both small user IDs and large timestamps.

export function encodeVarint(value) {
  const bytes = [];
  while (value >= 0x80) {
    bytes.push((value % 0x80) | 0x80);
    value = Math.floor(value / 0x80);
  }
  bytes.push(value & 0x7f);
  return Buffer.from(bytes);
}

export function decodeVarint(buffer, offset = 0) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buffer.length) {
    const byte = buffer[pos++];
    result += (byte & 0x7f) * (2 ** shift);
    if (!(byte & 0x80)) break;
    shift += 7;
  }
  return { value: result, length: pos - offset };
}