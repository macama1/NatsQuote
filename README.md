# NatsQuote — Cotizador NatStone / Piettra

Aplicación web para que los vendedores armen cotizaciones de productos **PyM** (pegamentos y morteros) y **CA** (piedra), y generen el PDF.

- `/` — Nueva cotización
- `/recuperar` — Cargar una cotización guardada por su número, modificarla y generar una nueva

## Cómo funciona

- El frontend es Next.js 16 (React 19), en `src/components/Cotizador.tsx`. Una sola pantalla sirve para "nueva" y "recuperar".
- Los datos y el PDF los maneja un **Google Apps Script**: clientes/PDV, productos, SKUs CA, cuentas bancarias, vendedores, guardar la cotización y crear el PDF en Drive.
- El navegador **no llama directo al Apps Script**. Llama a la ruta del servidor `src/app/api/cotizador/route.ts`, que es la única que conoce la URL del script. Esa ruta solo deja pasar las acciones que usa la app (`getAll`, `getQuote` y el POST que genera la cotización).

## Formas de entrega

Están en `src/lib/cotizacion.ts`:

| Forma de entrega | Dirección en la cotización | Comuna |
|---|---|---|
| Retiro en planta | Retiro Bodegas Piettra | Lampa |
| Retiro Bodega TVP | Retiro Bodega TVP San Pedro | San Pedro de la Paz |
| Despacho a obra | la del cliente (editable) | la del cliente (editable) |

Para agregar otra bodega: sumar una entrada en `RETIROS` y en `FORMAS_DE_ENTREGA`.

## Variables de entorno

Se configuran en Vercel → *Settings* → *Environment Variables* (y en `.env.local` para desarrollo).

| Variable | Para qué |
|---|---|
| `APPS_SCRIPT_URL` | URL `/exec` de la implementación del Apps Script. Si no está, se usa la URL antigua escrita en `route.ts`. |
| `APPS_SCRIPT_TOKEN` | Opcional. Clave que se envía como parámetro `token` en cada llamada al script. |

### Activar la clave en el Apps Script

1. Inventar una clave larga y ponerla en `APPS_SCRIPT_TOKEN` en Vercel.
2. En el Apps Script: *Configuración del proyecto* → *Propiedades del script* → agregar `TOKEN` con la misma clave.
3. Al inicio de `doGet(e)` y de `doPost(e)` agregar:

```js
const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
if (token && e.parameter.token !== token) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No autorizado' }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. Guardar y crear una **nueva implementación**. Poner su URL en `APPS_SCRIPT_URL` y archivar la implementación antigua (su URL quedó publicada en el historial del repositorio).

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:3000
npm run lint
npm run build
```
