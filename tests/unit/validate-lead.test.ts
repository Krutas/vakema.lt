import { describe, it, expect } from 'vitest';
import { validateLead } from '../../src/scripts/validate-lead';

describe('validateLead', () => {
  it('rejects an empty payload with all field errors', () => {
    const result = validateLead({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(['name', 'email', 'message']);
  });
  it('rejects null/undefined payloads', () => {
    expect(validateLead(null).ok).toBe(false);
    expect(validateLead(undefined).ok).toBe(false);
  });
  it('rejects a bad email', () => {
    const result = validateLead({ name: 'Testas Testauskas', email: 'bad', message: 'Noriu pasiūlymo dėl langų.' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(['email']);
  });
  it('rejects a too-short message', () => {
    const result = validateLead({ name: 'Testas Testauskas', email: 't@t.lt', message: 'short' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(['message']);
  });
  it('rejects a too-short name', () => {
    const result = validateLead({ name: 'T', email: 't@t.lt', message: 'Noriu pasiūlymo dėl langų.' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toEqual(['name']);
  });
  it('accepts a valid payload with optional phone', () => {
    const lead = { name: 'Testas Testauskas', email: 't@t.lt', phone: '+37060000000', message: 'Noriu pasiūlymo dėl langų.' };
    const result = validateLead(lead);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lead).toEqual(lead);
  });
  it('accepts a valid payload without phone', () => {
    expect(validateLead({ name: 'Testas Testauskas', email: 't@t.lt', message: 'Noriu pasiūlymo dėl langų.' }).ok).toBe(true);
  });
});
