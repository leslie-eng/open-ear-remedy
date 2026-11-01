import crypto from 'node:crypto';

/** Amounts are stored in cents (minor units): KSh 135 is 13500. */
export function toMinor(major) {
  const minor = Math.round(Number(major) * 100);
  if (!Number.isFinite(minor) || minor < 0) throw new Error('Invalid price amount');
  return minor;
}

export function newReference(prefix, userId) {
  return `${prefix}_${userId.slice(0, 8)}_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
}
