export interface Lead { name: string; email: string; phone?: string; message: string; }
export function validateLead(l: unknown): { ok: true; lead: Lead } | { ok: false; errors: string[] } {
  const v = l as Partial<Lead> ?? {};
  const errors: string[] = [];
  if (!v.name || v.name.trim().length < 2) errors.push('name');
  if (!v.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) errors.push('email');
  if (!v.message || v.message.trim().length < 10) errors.push('message');
  return errors.length ? { ok: false, errors } : { ok: true, lead: v as Lead };
}
