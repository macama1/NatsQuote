// src/lib/cotizacion.ts
// Lógica compartida entre "Nueva cotización" y "Recuperar cotización".

export const API_URL =
  'https://script.google.com/macros/s/AKfycbyxd8jZhYGbJJRh2dkWa4e8kvHE1NsO9zf9HnvASPOog2d3y5QIsyPkt-t-fl8FaT6bKQ/exec';

export const IVA_RATE = 0.19;

// Cuando la entrega es "Retiro en planta", esta es la dirección que va en la cotización.
export const ENTREGA_RETIRO = 'Retiro en planta';
export const DIRECCION_RETIRO = 'Retiro Bodegas Piettra';

// fetch con reintentos: fallas transitorias de Apps Script no deberían bloquear la carga.
export async function fetchJsonWithRetry<T = unknown>(url: string, retries = 2, delayMs = 1200): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error('Respuesta no es JSON válido (posible error de permisos o script caído).');
      }
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

// Mismo cálculo que hace el Apps Script, para que la pantalla y el PDF muestren exactamente lo mismo:
// cada línea se redondea a pesos, el IVA se redondea y el total es la suma.
export function computeTotals(products: { currentPrice: number; quantity: number }[]) {
  const subtotal = products.reduce((sum, p) => sum + lineTotal(p), 0);
  const iva = Math.round(subtotal * IVA_RATE);
  return { subtotal, iva, total: subtotal + iva };
}

export function lineTotal(p: { currentPrice: number; quantity: number }) {
  return Math.round((Number(p.currentPrice) || 0) * (Number(p.quantity) || 0));
}

// Formato chileno: $1.234.567
export function formatCLP(n: number) {
  const v = Math.round(Number(n) || 0);
  const digits = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (v < 0 ? '-$' : '$') + digits;
}

// Devuelve un mensaje de error si algún producto no se puede cotizar, o null si todo está bien.
export function validateProducts(products: { code: string; description: string; quantity: number; currentPrice: number }[]) {
  const sinCantidad = products.filter(p => !(Number(p.quantity) > 0));
  if (sinCantidad.length > 0) {
    const lista = sinCantidad.map(p => `• ${p.code} - ${p.description}`).join('\n');
    return `Estos productos tienen cantidad 0. Corrige la cantidad o elimínalos:\n\n${lista}`;
  }
  const sinPrecio = products.filter(p => !isFinite(Number(p.currentPrice)));
  if (sinPrecio.length > 0) {
    return `Hay productos con un precio inválido: ${sinPrecio.map(p => p.code).join(', ')}`;
  }
  return null;
}
