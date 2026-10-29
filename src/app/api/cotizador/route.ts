// src/app/api/cotizador/route.ts
// Puente entre el navegador y el Apps Script. La URL del script (y la clave opcional) viven solo
// en el servidor, así no quedan visibles en el código que descarga el navegador.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   APPS_SCRIPT_URL    URL /exec de la implementación del Apps Script.
//   APPS_SCRIPT_TOKEN  (opcional) clave compartida; se envía como "token" en cada llamada
//                      para que el Apps Script rechace a quien no la tenga.

import { NextRequest, NextResponse } from 'next/server';

// Generar el PDF en Apps Script puede tardar varios segundos.
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Respaldo para no cortar el servicio mientras no esté configurada APPS_SCRIPT_URL.
const FALLBACK_URL =
  'https://script.google.com/macros/s/AKfycbyxd8jZhYGbJJRh2dkWa4e8kvHE1NsO9zf9HnvASPOog2d3y5QIsyPkt-t-fl8FaT6bKQ/exec';

const SCRIPT_URL = process.env.APPS_SCRIPT_URL || FALLBACK_URL;
const TOKEN = process.env.APPS_SCRIPT_TOKEN || '';

// Solo se reenvían las acciones que usa la app.
const ALLOWED_ACTIONS = new Set(['getAll', 'getQuote']);

function errorJson(message: string, status = 502) {
  return NextResponse.json({ status: 'error', message }, { status });
}

// Apps Script responde con una redirección; fetch la sigue y devolvemos el JSON final tal cual.
async function relay(res: Response) {
  const text = await res.text();
  if (!res.ok) return errorJson(`Apps Script respondió HTTP ${res.status}`);
  return new NextResponse(text, {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action') || '';
  if (!ALLOWED_ACTIONS.has(action)) return errorJson('Acción no permitida', 400);

  const url = new URL(SCRIPT_URL);
  url.searchParams.set('action', action);
  const id = req.nextUrl.searchParams.get('id');
  if (action === 'getQuote') {
    if (!id || !/^\d+$/.test(id.trim())) return errorJson('Número de cotización inválido', 400);
    url.searchParams.set('id', id.trim());
  }
  if (TOKEN) url.searchParams.set('token', TOKEN);

  try {
    return await relay(await fetch(url, { cache: 'no-store', redirect: 'follow' }));
  } catch (err) {
    console.error('Error llamando al Apps Script (GET):', err);
    return errorJson('No se pudo contactar al Apps Script.');
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    JSON.parse(body);
  } catch {
    return errorJson('Cuerpo inválido', 400);
  }

  const url = new URL(SCRIPT_URL);
  if (TOKEN) url.searchParams.set('token', TOKEN);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      cache: 'no-store',
      redirect: 'follow',
    });
    return await relay(res);
  } catch (err) {
    console.error('Error llamando al Apps Script (POST):', err);
    return errorJson('No se pudo contactar al Apps Script.');
  }
}
