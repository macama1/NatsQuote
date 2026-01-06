import { QuoteProduct } from '@/types';
import { useState, useEffect } from 'react';

// Nuevo componente para el input de cantidad, con estado local
const QuantityInput = ({ product, onQuantityChange }: { product: QuoteProduct; onQuantityChange: (code: string, newQuantity: number) => void; }) => {
  const [inputValue, setInputValue] = useState(product.quantity.toString().replace('.', ','));

  useEffect(() => {
    // Sincroniza el input si el valor cambia desde fuera (ej. descuentos automáticos)
    setInputValue(product.quantity.toString().replace('.', ','));
  }, [product.quantity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value); // Permite escribir libremente, incluyendo la coma

    // Solo actualiza el estado global si es un número válido
    const numericValue = parseFloat(value.replace(',', '.'));
    if (!isNaN(numericValue)) {
      onQuantityChange(product.code, numericValue);
    } else if (value === '' || value === '0,') {
      onQuantityChange(product.code, 0);
    }
  };
  
  const handleBlur = () => {
    // Al salir del campo, formatea el número a un estado consistente
    const numericValue = parseFloat(inputValue.replace(',', '.'));
     if (isNaN(numericValue) || numericValue <= 0) {
        setInputValue('0');
        onQuantityChange(product.code, 0);
    } else {
        setInputValue(numericValue.toString().replace('.', ','));
    }
  };

  return (
    <input 
      type="text" 
      value={inputValue} 
      onChange={handleChange}
      onBlur={handleBlur}
      className="w-24 p-1 text-center bg-slate-700 rounded border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
    />
  );
};


type ProductTableProps = {
  products: QuoteProduct[];
  onQuantityChange: (code: string, newQuantity: number) => void;
  onDelete: (code: string) => void;
  onPriceChange: (code: string, newPrice: number) => void;
};

export default function ProductTable({
  products,
  onQuantityChange,
  onDelete,
  onPriceChange
}: ProductTableProps) {
  
  return (
    <div className="mb-10 overflow-x-auto">
      <h2 className="text-2xl font-bold mb-4">Productos en Cotización</h2>
      <div className="border border-slate-700 rounded-lg">
        <table className="w-full text-left min-w-[700px]">
          <thead className="bg-slate-900">
            <tr className="border-b border-slate-600">
              <th className="p-3 font-semibold">CÓDIGO</th>
              <th className="p-3 font-semibold">PRODUCTO</th>
              <th className="p-3 font-semibold text-right">PRECIO UNIT.</th>
              <th className="p-3 font-semibold text-center">CANTIDAD</th>
              <th className="p-3 font-semibold text-right">SUBTOTAL</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={6} className="text-center p-8 text-slate-400">Aún no has agregado productos.</td></tr>
            ) : products.map(p => (
              <tr key={p.code} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50">
                <td className="p-3 font-mono">{p.code}</td>
                <td className="p-3">{p.description}</td>
                <td className="p-3 text-right">
                  {p.linea === 'PyM' ? (
                    <div className="flex items-center justify-end gap-1">
                      <span>$</span>
                      <input 
                        type="number"
                        value={p.currentPrice}
                        onChange={(e) => onPriceChange(p.code, parseFloat(e.target.value) || 0)}
                        className="w-28 p-1 text-right bg-slate-700 rounded border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                      />
                    </div>
                  ) : (
                    `$${p.currentPrice.toLocaleString('es-CL')}`
                  )}
                </td>
                <td className="p-3 text-center">
                  <QuantityInput product={p} onQuantityChange={onQuantityChange} />
                </td>
                <td className="p-3 text-right font-semibold">${(p.currentPrice * p.quantity).toLocaleString('es-CL', {minimumFractionDigits: 0, maximumFractionDigits: 2})}</td>
                <td className="p-3 text-center">
                  <button onClick={() => onDelete(p.code)} className="text-red-500 hover:text-red-400 font-bold text-2xl transition-colors duration-200">×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
