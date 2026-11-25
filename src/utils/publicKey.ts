// NEAR public keys are serialized as "{curve}:{base58-data}".
// Classic curves: ed25519, secp256k1.
// Post-quantum (FIPS-204 / NIST ML-DSA) curves: ml-dsa-44, ml-dsa-65, ml-dsa-87.

export interface ParsedPublicKey {
  curve: string; // e.g. "ed25519", "ml-dsa-65"
  data: string; // base58 payload after the first ":"
  isPostQuantum: boolean;
}

export function parsePublicKey(publicKey: string): ParsedPublicKey {
  const idx = publicKey.indexOf(":");
  const curve = idx === -1 ? "" : publicKey.slice(0, idx);
  const data = idx === -1 ? publicKey : publicKey.slice(idx + 1);
  return {
    curve,
    data,
    isPostQuantum: curve.toLowerCase().startsWith("ml-dsa"),
  };
}

/**
 * Middle-truncate the base58 payload for display. ML-DSA payloads are
 * thousands of chars, so a head+tail preview keeps rows readable while the
 * full key stays available via copy / tooltip.
 */
export function truncatePublicKeyData(data: string, head = 8, tail = 6): string {
  if (data.length <= head + tail + 1) return data;
  return `${data.slice(0, head)}…${data.slice(-tail)}`;
}
