import { onRequest } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { validateLead } from './validate-lead'; // copied from src/scripts/validate-lead.ts — single source of truth

initializeApp();
const resendKey = defineSecret('RESEND_API_KEY');
const ALLOWED_ORIGINS = ['https://vakema.lt', 'https://www.vakema.lt', 'http://localhost:4321'];

export const submitLead = onRequest({ secrets: [resendKey], region: 'europe-west1' }, async (req, res) => {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) res.set('Access-Control-Allow-Origin', origin);
  if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'method_not_allowed' }); return; }

  const result = validateLead(req.body);
  if (!result.ok) { res.status(400).json({ error: 'validation', fields: result.errors }); return; }

  // honeypot: bots fill the hidden "company" field
  if ((req.body as { company?: string }).company) { res.status(200).json({ ok: true }); return; }

  const doc = await getFirestore().collection('leads').add({
    ...result.lead,
    createdAt: FieldValue.serverTimestamp(),
    ua: req.headers['user-agent'] ?? null,
  });

  // Email is best-effort: no key configured (or send failure) → log only, lead still stored.
  let apiKey = '';
  try {
    apiKey = resendKey.value();
  } catch {
    apiKey = '';
  }
  if (!apiKey) {
    logger.info('RESEND_API_KEY not set — lead stored in Firestore only', { leadId: doc.id });
  } else {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'svetaine@vakema.lt',
          to: ['info@vakema.lt'],
          subject: `Nauja užklausa: ${result.lead.name}`,
          text: `${result.lead.name}\n${result.lead.email}\n${result.lead.phone ?? '-'}\n\n${result.lead.message}\n\nFirestore: ${doc.id}`,
        }),
      });
    } catch (err) {
      logger.error('Resend send failed — lead still stored', { leadId: doc.id, err });
    }
  }

  res.status(200).json({ ok: true });
});
