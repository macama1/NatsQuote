'use client';
import { useState, useEffect, useMemo } from 'react';
import Select, { StylesConfig, SingleValue, MultiValue } from 'react-select';
import Image from 'next/image';

import { ClientEntry, PyMProduct, CA_SKU, QuoteProduct, SelectOption } from '@/types';

/* ============================================================
   QuoteHeader
   ============================================================ */
export function QuoteHeader() {
  return (
    <div className="flex items-center gap-10 mb-10">
      <Image
        src="/logo.png"
        alt="Logo"
        width={200}
        height={50}
        className="w-auto h-10 md:h-12"
      />
      <h1 className="text-2xl md:text-6xl font-bold">Cotizador</h1>
    </div>
  );
}

/* ============================================================
   ClientOnly (evita problemas de hidratación con react-select)
   ============================================================ */
export function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div className="space-y-4">
          <div className="flex gap-2 pt-2">
            <div className="bg-slate-700 h-10 w-36 rounded animate-pulse"></div>
            <div className="bg-slate-700 h-10 w-36 rounded animate-pulse"></div>
          </div>
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-2 mt-4"></div>
          <div className="h-10 bg-slate-700 rounded"></div>
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-2 mt-4"></div>
          <div className="h-10 bg-slate-700 rounded"></div>
        </div>
        <div className="space-y-4 animate-pulse">
          <div>
            <div className="h-6 bg-slate-700 rounded w-1/3 mb-2"></div>
            <div className="h-10 bg-slate-700 rounded"></div>
          </div>
          <div>
            <div className="h-6 bg-slate-700 rounded w-1/3 mb-2"></div>
            <div className="h-10 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/* ============================================================
   ClientSelector
   ============================================================ */
type ClientSelectorProps = {
  allClientEntries: ClientEntry[];
  selectedCompany: SelectOption | null;
  selectedPDV: ClientEntry | null;
  onSelectCompany: (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => void;
  onSelectPDV: (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => void;
  formaDePago: string;
  setFormaDePago: (value: string) => void;
  formaDeEntrega: string;
  setFormaDeEntrega: (value: string) => void;
  editableRut: string;
  setEditableRut: (value: string) => void;
  editableDireccion: string;
  setEditableDireccion: (value: string) => void;
  editableComuna: string;
  setEditableComuna: (value: string) => void;
  isGenericMode: boolean;
  onToggleGenericMode: (value: boolean) => void;
  genericEmpresaName: string;
  setGenericEmpresaName: (value: string) => void;
};

export function ClientSelector({
  allClientEntries, selectedCompany, selectedPDV,
  onSelectCompany, onSelectPDV,
  formaDePago, setFormaDePago, formaDeEntrega, setFormaDeEntrega,
  editableRut, setEditableRut, editableDireccion, setEditableDireccion,
  editableComuna, setEditableComuna,
  isGenericMode, onToggleGenericMode, genericEmpresaName, setGenericEmpresaName
}: ClientSelectorProps) {

  const companyOptions: SelectOption[] = useMemo(() =>
    [...new Set((allClientEntries || []).map(c => c.empresa))].sort().map(company => ({ value: company, label: company }))
  , [allClientEntries]);

  const pdvOptions: SelectOption[] = useMemo(() =>
    (allClientEntries || []).filter(c => c.empresa === selectedCompany?.value).map(pdv => ({ value: pdv.id, label: pdv.obraPDV }))
  , [allClientEntries, selectedCompany]);

  const customSelectStyles: StylesConfig<SelectOption> = {
    control: (provided) => ({ ...provided, backgroundColor: '#334155', borderColor: '#475569', color: 'white', minHeight: '42px' }),
    singleValue: (provided) => ({ ...provided, color: 'white' }),
    input: (provided) => ({ ...provided, color: 'white' }),
    menu: (provided) => ({ ...provided, backgroundColor: '#1e293b' }),
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#2563eb' : (state.isFocused ? '#334155' : 'transparent'), ':active': { backgroundColor: '#1d4ed8' } }),
    placeholder: (provided) => ({ ...provided, color: '#94a3b8' }),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-10">

      <div className="md:col-span-2 flex gap-3 mb-2">
        <button
          type="button"
          onClick={() => onToggleGenericMode(false)}
          className={`flex-1 py-2.5 px-4 rounded font-semibold border transition-colors ${!isGenericMode ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
        >
          Cliente Registrado
        </button>
        <button
          type="button"
          onClick={() => onToggleGenericMode(true)}
          className={`flex-1 py-2.5 px-4 rounded font-semibold border transition-colors ${isGenericMode ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600 hover:bg-slate-600'}`}
        >
          Cotización Genérica
        </button>
      </div>

      <div>
        <label className="block mb-2 font-semibold">Forma de Pago:</label>
        <select value={formaDePago} onChange={e => setFormaDePago(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600">
          <option>Contado</option><option>Transferencia</option><option>WebPay</option><option>Orden de Compra</option>
        </select>
      </div>
      {isGenericMode ? (
        <div>
          <label className="block mb-2 font-semibold">1. Nombre de la Empresa</label>
          <input
            type="text"
            value={genericEmpresaName}
            onChange={e => setGenericEmpresaName(e.target.value)}
            placeholder="Escriba el nombre de la empresa..."
            className="w-full p-2.5 rounded bg-slate-700 border border-slate-600"
          />
        </div>
      ) : (
        <div>
          <label className="block mb-2 font-semibold">1. Seleccione Empresa</label>
          <Select instanceId="company-select" options={companyOptions} value={selectedCompany} onChange={onSelectCompany} styles={customSelectStyles} placeholder="Buscar empresa..." isClearable />
        </div>
      )}

      <div>
        <label className="block mb-2 font-semibold">Forma de Entrega:</label>
        <select value={formaDeEntrega} onChange={e => setFormaDeEntrega(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600">
          <option>Retiro en planta</option><option>Despacho a obra</option>
        </select>
      </div>
      {isGenericMode ? (
        <div className="hidden md:block"></div>
      ) : (
        <div>
          <label className="block mb-2 font-semibold">2. Seleccione Obra/PDV</label>
          <Select instanceId="pdv-select" options={pdvOptions} value={pdvOptions.find(opt => opt.value === selectedPDV?.id) || null} onChange={onSelectPDV} styles={customSelectStyles} isDisabled={!selectedCompany} placeholder={selectedCompany ? "Buscar obra..." : "Seleccione una empresa primero"} isClearable />
        </div>
      )}

      <div>
        <label className="block mb-2 font-semibold">RUT</label>
        <input type="text" value={editableRut} onChange={e => setEditableRut(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600" />
      </div>
      <div>
        <label className="block mb-2 font-semibold">Dirección de Despacho</label>
        <input type="text" value={editableDireccion} onChange={e => setEditableDireccion(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600" />
      </div>

      <div>
        <label className="block mb-2 font-semibold">Comuna</label>
        <input type="text" value={editableComuna} onChange={e => setEditableComuna(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600" />
      </div>
      <div className="hidden md:block"></div>

      <div className="md:col-span-2 pt-2">
        <a href="https://obras-gamma.vercel.app/" target="_blank" rel="noopener noreferrer" className="w-full block bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 px-4 rounded text-center transition-transform duration-200 hover:scale-105">
          Crear Punto de Venta (Radar Comercial)
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   ProductTable (+ QuantityInput interno, no exportado)
   ============================================================ */
function QuantityInput({ product, onQuantityChange }: { product: QuoteProduct; onQuantityChange: (code: string, newQuantity: number) => void; }) {
  const [inputValue, setInputValue] = useState(product.quantity.toString().replace('.', ','));

  useEffect(() => {
    setInputValue(product.quantity.toString().replace('.', ','));
  }, [product.quantity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    const numericValue = parseFloat(value.replace(',', '.'));
    if (!isNaN(numericValue)) {
      onQuantityChange(product.code, numericValue);
    } else if (value === '' || value === '0,') {
      onQuantityChange(product.code, 0);
    }
  };

  const handleBlur = () => {
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
}

type ProductTableProps = {
  products: QuoteProduct[];
  onQuantityChange: (code: string, newQuantity: number) => void;
  onDelete: (code: string) => void;
  onPriceChange: (code: string, newPrice: number) => void;
};

export function ProductTable({ products, onQuantityChange, onDelete, onPriceChange }: ProductTableProps) {
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
                  <div className="flex items-center justify-end gap-1">
                    <span>$</span>
                    <input
                      type="number"
                      value={p.currentPrice}
                      onChange={(e) => onPriceChange(p.code, parseFloat(e.target.value) || 0)}
                      className="w-28 p-1 text-right bg-slate-700 rounded border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </td>
                <td className="p-3 text-center">
                  <QuantityInput product={p} onQuantityChange={onQuantityChange} />
                </td>
                <td className="p-3 text-right font-semibold">${(p.currentPrice * p.quantity).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
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

/* ============================================================
   QuoteTotals
   ============================================================ */
type QuoteTotalsProps = {
  subtotal: number;
  iva: number;
  total: number;
  isGenerating: boolean;
  isClientSelected: boolean;
  onGenerateQuote: () => void;
};

export function QuoteTotals({ subtotal, iva, total, isGenerating, isClientSelected, onGenerateQuote }: QuoteTotalsProps) {
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

/* ============================================================
   ProductModal (+ Modal base interno, no exportado)
   ============================================================ */
function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string; }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-slate-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-lg">
        <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-3">
          <h2 className="text-2xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-white font-bold text-3xl leading-none hover:text-slate-400">&times;</button>
        </div>
        <div className="overflow-y-auto flex-grow">{children}</div>
      </div>
    </div>
  );
}

type ProductModalProps = {
  modalType: 'PyM' | 'CA';
  onClose: () => void;
  allPyMProducts: PyMProduct[];
  allCA_SKUs: CA_SKU[];
  onSelectProduct: (product: PyMProduct | CA_SKU) => void;
};

export function ProductModal({ modalType, onClose, allPyMProducts, allCA_SKUs, onSelectProduct }: ProductModalProps) {
  const [pymSearch, setPymSearch] = useState('');
  const [selectedModelo, setSelectedModelo] = useState<string>('');
  const caModelos = useMemo(() => [...new Set(allCA_SKUs.map(p => p.modelo))], [allCA_SKUs]);
  const caColores = useMemo(() => allCA_SKUs.filter(p => p.modelo === selectedModelo), [allCA_SKUs, selectedModelo]);

  return (
    <Modal onClose={onClose} title={`Seleccionar Producto ${modalType}`}>
      {modalType === 'PyM' && (
        <div>
          <input type="text" placeholder="Buscar por código o nombre..." value={pymSearch} onChange={e => setPymSearch(e.target.value)} className="w-full p-2 mb-4 bg-slate-700 rounded border border-slate-600 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          <div className="space-y-1">
            {allPyMProducts.filter(p => p.productName.toLowerCase().includes(pymSearch.toLowerCase()) || p.code.toLowerCase().includes(pymSearch.toLowerCase())).map(p => (
              <div key={p.code} onClick={() => onSelectProduct(p)} className="p-2 hover:bg-slate-700 cursor-pointer rounded">
                <span className="font-bold">{p.code}</span> - {p.productName}
              </div>
            ))}
          </div>
        </div>
      )}
      {modalType === 'CA' && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold mb-2 text-lg border-b border-slate-700 pb-2">1. Seleccione un Modelo</h3>
            <div className="space-y-1 mt-2">
              {caModelos.map(modelo => (
                <button key={modelo} onClick={() => setSelectedModelo(modelo)} className={`w-full text-left p-2 rounded transition-colors duration-200 ${selectedModelo === modelo ? 'bg-blue-600 font-bold' : 'hover:bg-slate-700'}`}>
                  {modelo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-2 text-lg border-b border-slate-700 pb-2">2. Seleccione un Color</h3>
            <div className="space-y-1 mt-2">
              {selectedModelo ? (
                caColores.map(p => (
                  <div key={p.code} onClick={() => onSelectProduct(p)} className="p-2 hover:bg-slate-700 cursor-pointer rounded">
                    {p.color} <span className="text-xs text-slate-400 font-mono">({p.code})</span>
                  </div>
                ))
              ) : <p className="text-slate-400 italic mt-2">Seleccione un modelo para ver los colores.</p>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
