type QuoteTotalsProps = {
  subtotal: number;
  iva: number;
  total: number;
  isGenerating: boolean;
  isClientSelected: boolean;
  onGenerateQuote: () => void;
};

export default function QuoteTotals({ 
  subtotal, 
  iva, 
  total, 
  isGenerating, 
  isClientSelected,
  onGenerateQuote 
}: QuoteTotalsProps) {
  return (
    <div className="flex justify-center md:justify-end">
      <div className="w-full md:w-2/5 lg:w-1/3 space-y-2 bg-slate-900 p-4 rounded-lg border border-slate-700">
        <div className="flex justify-between text-lg">
          <span className="text-slate-400">Subtotal:</span>
          <span>${subtotal.toLocaleString('es-CL')}</span>
        </div>
        <div className="flex justify-between text-lg">
          <span className="text-slate-400">IVA (19%):</span>
          <span>${iva.toLocaleString('es-CL')}</span>
        </div>
        <div className="flex justify-between text-2xl font-bold border-t border-slate-600 pt-2 mt-2">
          <span>Total a Pagar:</span>
          <span>${total.toLocaleString('es-CL')}</span>
        </div>
        <button 
          onClick={onGenerateQuote} 
          disabled={isGenerating || !isClientSelected} 
          className="w-full mt-4 p-3 bg-orange-600 hover:bg-orange-500 rounded font-bold text-lg transition-transform duration-200 hover:scale-105 disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {isGenerating ? 'PROCESANDO...' : 'GENERAR COTIZACIÓN'}
        </button>
      </div>
    </div>
  );
}
