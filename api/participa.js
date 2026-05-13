// =================================================================
// /api/participa  —  Vercel Serverless Function
// Recibe testimonios del formulario #participaForm, los guarda en
// Supabase y envía notificación por correo via Resend.
// =================================================================

import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// ---- Helpers ----
const json = (res, status, body) => {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
};

const escapeHtml = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const isString = (v, min = 0, max = Infinity) =>
  typeof v === 'string' && v.trim().length >= min && v.trim().length <= max;

// ---- Handler ----
export default async function handler(req, res) {
  // CORS básico (mismo origen en Vercel — esto es por si se llama desde otro front)
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return json(res, 405, { ok: false, error: 'Método no permitido' });
  }

  // ---- Parseo del body (Vercel ya parsea JSON por defecto) ----
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const nombre       = (body.nombre || '').trim();
  const vinculo      = (body.vinculo || '').trim();
  const testimonio   = (body.testimonio || '').trim();
  const anio         = (body.anio || '').trim();
  const autorizacion = body.autorizacion === true || body.autorizacion === 'true' || body.autorizacion === 'on';

  // ---- Validación ----
  const errors = [];
  if (!isString(nombre, 2, 120))        errors.push('nombre');
  if (!isString(testimonio, 10, 5000))  errors.push('testimonio');
  if (!autorizacion)                    errors.push('autorizacion');

  if (errors.length) {
    return json(res, 400, {
      ok: false,
      error: 'Campos inválidos o incompletos',
      fields: errors,
    });
  }

  // ---- Variables de entorno ----
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY,
    RESEND_FROM = 'HUAP Patrimonio <onboarding@resend.dev>',
    CONTACT_EMAIL_TO,
  } = process.env;

  const missingEnv = [];
  if (!SUPABASE_URL)              missingEnv.push('SUPABASE_URL');
  if (!SUPABASE_SERVICE_ROLE_KEY) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!RESEND_API_KEY)            missingEnv.push('RESEND_API_KEY');
  if (!CONTACT_EMAIL_TO)          missingEnv.push('CONTACT_EMAIL_TO');

  if (missingEnv.length) {
    // Loguear pero NO exponer detalles al cliente
    console.error('[participa] Variables de entorno faltantes:', missingEnv.join(', '));
    return json(res, 500, {
      ok: false,
      error: 'Servicio temporalmente no disponible. Por favor intenta más tarde.',
    });
  }

  // ---- Metadatos técnicos ----
  const ip =
    (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers['user-agent'] || null;

  // ---- 1) Persistencia en Supabase ----
  let inserted = null;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from('participa_submissions')
      .insert({
        nombre,
        vinculo: vinculo || null,
        testimonio,
        anio: anio || null,
        autorizacion,
        ip_address: ip,
        user_agent: userAgent,
        source: 'web',
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    inserted = data;
  } catch (err) {
    console.error('[participa] Supabase insert error:', err?.message || err);
    return json(res, 500, {
      ok: false,
      error: 'No pudimos guardar tu testimonio. Inténtalo de nuevo en unos minutos.',
    });
  }

  // ---- 2) Notificación por correo (no es bloqueante para el usuario) ----
  let emailStatus = 'sent';
  try {
    const resend = new Resend(RESEND_API_KEY);

    const subject = `[Posta Central] Nuevo testimonio de ${nombre}`;
    const html = `
      <div style="font-family: Inter, Arial, sans-serif; max-width:640px; margin:0 auto; color:#1f2937;">
        <div style="background:#C0272D; color:#fff; padding:16px 20px; border-radius:8px 8px 0 0;">
          <h2 style="margin:0; font-size:18px;">Nuevo testimonio recibido — Día del Patrimonio HUAP</h2>
        </div>
        <div style="border:1px solid #e5e7eb; border-top:none; padding:20px; border-radius:0 0 8px 8px; background:#fff;">
          <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
          <p><strong>Vínculo con la Posta Central:</strong> ${escapeHtml(vinculo || '— no indicado —')}</p>
          <p><strong>Período aproximado:</strong> ${escapeHtml(anio || '— no indicado —')}</p>
          <p><strong>Testimonio:</strong></p>
          <blockquote style="border-left:3px solid #C0272D; padding:8px 14px; margin:8px 0; background:#fdf0f0; white-space:pre-wrap;">${escapeHtml(testimonio)}</blockquote>
          <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;" />
          <p style="font-size:12px; color:#6b7280;">
            ID: ${escapeHtml(inserted?.id || '')}<br/>
            Recibido: ${escapeHtml(inserted?.created_at || new Date().toISOString())}<br/>
            IP: ${escapeHtml(ip || 'n/a')}<br/>
            UA: ${escapeHtml(userAgent || 'n/a')}
          </p>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: RESEND_FROM,
      to: CONTACT_EMAIL_TO,
      subject,
      html,
      reply_to: CONTACT_EMAIL_TO,
    });
  } catch (err) {
    console.error('[participa] Resend error:', err?.message || err);
    emailStatus = 'failed'; // se guardó en DB pero el correo falló
  }

  // ---- Respuesta al cliente ----
  return json(res, 200, {
    ok: true,
    id: inserted?.id,
    emailStatus,
  });
}
