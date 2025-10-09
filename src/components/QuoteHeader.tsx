// src/components/QuoteHeader.tsx

'use client';
import Image from 'next/image'; // <-- CORRECCIÓN: Se importa el componente Image

export default function QuoteHeader() {
  return (
    <div className="flex items-center gap-10 mb-10">
      {/* CORRECCIÓN: Se reemplaza <img> por <Image> para optimización automática */}
      <Image 
        src="/logo.png" 
        alt="Logo" 
        width={200} // Propiedad requerida para evitar saltos de layout
        height={50} // Propiedad requerida para evitar saltos de layout
        className="w-auto h-10 md:h-12" // Clases para controlar el tamaño visual
      />
      <h1 className="text-2xl md:text-6xl font-bold">Cotizador</h1>
    </div>
  );
}