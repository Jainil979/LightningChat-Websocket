// utils/wipeBytes.js
export function wipeBytes(bytes) {
  if (!bytes) return;
  bytes.fill(0);
}