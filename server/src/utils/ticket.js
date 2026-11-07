/** 1 -> "KV-001", 42 -> "KV-042", 1234 -> "KV-1234" (never truncates). */
export const formatTicket = (seq) => `KV-${String(seq).padStart(3, '0')}`;

/** "KV-042" | "kv 42" | "KV042" -> 42, otherwise null. */
export function parseTicket(input) {
  const m = /^kv[-\s]?(\d{1,9})$/i.exec(String(input).trim());
  return m ? Number(m[1]) : null;
}
