// src/utils/security.js
// Centralized Security & Cryptographic Verification Helpers
// Eliminates plaintext hardcoded passwords from client-side bundles.

/**
 * Pure synchronous SHA-256 implementation
 */
export function sha256Sync(ascii) {
  if (typeof ascii !== 'string') ascii = String(ascii || '');
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii.length * 8;
  let hash = sha256Sync.h = sha256Sync.h || [];
  const k = sha256Sync.k = sha256Sync.k || [];
  let primeCounter = k.length;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (ascii.length % 64 - 56) ascii += '\x00';
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[words.length] = ((asciiBitLength / maxWord) | 0);
  words[words.length] = (asciiBitLength);
  for (j = 0; j < words.length;) {
    const w = words.slice(j, j += 16);
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16) ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Authorized SHA-256 digests (No plaintext secrets in bundle)
const AUTHORIZED_HASHES = {
  SETTINGS_PIN: '712dca40936b39ce670dc803736fe3735cf99311030a928de039a36f77926230',
  TASK_EDIT_DELETE_PIN: '928f3f37d820114a2bb4287752fd918da1ed9f0d51169d26564833257c8966f0',
  INFORM_MASTER_ADMIN_PIN: '23743caefafa0565c74fe1f4cd8ce81c9f6fa86e95832c2bd51ddda71d3f4ad1',
  SUPERVISOR_SPECIAL_PIN: 'e093b98610c07b9c1cce99ca0e0a4f780d504a331e70d147855bdb07dd039266'
};

/**
 * Validates entered PIN against cryptographic hashes for specific actions
 * @param {string} enteredPin - The PIN string entered by user
 * @param {'inform_admin'|'task_action'|'settings'|'supervisor'} action
 * @returns {boolean}
 */
export function verifyAdminPin(enteredPin, action = 'inform_admin') {
  if (!enteredPin || typeof enteredPin !== 'string') return false;
  const hash = sha256Sync(enteredPin.trim());

  switch (action) {
    case 'inform_admin':
      return hash === AUTHORIZED_HASHES.INFORM_MASTER_ADMIN_PIN;
    
    case 'task_action':
      // Allows task action PIN or master admin PIN
      return hash === AUTHORIZED_HASHES.TASK_EDIT_DELETE_PIN ||
             hash === AUTHORIZED_HASHES.INFORM_MASTER_ADMIN_PIN;

    case 'settings':
      // Allows settings PIN, task action PIN, or master admin PIN
      return hash === AUTHORIZED_HASHES.SETTINGS_PIN ||
             hash === AUTHORIZED_HASHES.TASK_EDIT_DELETE_PIN ||
             hash === AUTHORIZED_HASHES.INFORM_MASTER_ADMIN_PIN;

    case 'supervisor':
      return hash === AUTHORIZED_HASHES.SETTINGS_PIN ||
             hash === AUTHORIZED_HASHES.TASK_EDIT_DELETE_PIN ||
             hash === AUTHORIZED_HASHES.INFORM_MASTER_ADMIN_PIN ||
             hash === AUTHORIZED_HASHES.SUPERVISOR_SPECIAL_PIN;

    default:
      return false;
  }
}
