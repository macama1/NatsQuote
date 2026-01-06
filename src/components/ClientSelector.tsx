// src/components/ClientSelector.tsx

'use client';
import { useMemo } from 'react';
// CORRECCIÓN: Se importa MultiValue para usarlo en los tipos de las props
import Select, { StylesConfig, SingleValue, MultiValue } from 'react-select';
import { ClientEntry, SelectOption } from '@/types';

type ClientSelectorProps = {
  allClientEntries: ClientEntry[];
  selectedCompany: SelectOption | null;
  selectedPDV: ClientEntry | null;
  // CORRECCIÓN: Se actualizan los tipos de las props para que acepten ambos valores
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
};

export default function ClientSelector({
  allClientEntries, selectedCompany, selectedPDV,
  onSelectCompany, onSelectPDV,
  formaDePago, setFormaDePago, formaDeEntrega, setFormaDeEntrega,
  editableRut, setEditableRut, editableDireccion, setEditableDireccion
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
    option: (provided, state) => ({ ...provided, backgroundColor: state.isSelected ? '#2563eb' : (state.isFocused ? '#334155' : 'transparent'), ':active': { backgroundColor: '#1d4ed8' }, }),
    placeholder: (provided) => ({ ...provided, color: '#94a3b8' }),
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-10">

      {/* FILA 1 */}
      <div>
        <label className="block mb-2 font-semibold">Forma de Pago:</label>
        <select value={formaDePago} onChange={e => setFormaDePago(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600">
          <option>Contado</option><option>Transferencia</option><option>WebPay</option><option>Orden de Compra</option>
        </select>
      </div>
      <div>
        <label className="block mb-2 font-semibold">1. Seleccione Empresa</label>
        {/* Ahora esta línea es válida porque onSelectCompany acepta el tipo correcto */}
        <Select instanceId="company-select" options={companyOptions} value={selectedCompany} onChange={onSelectCompany} styles={customSelectStyles} placeholder="Buscar empresa..." isClearable />
      </div>
      
      {/* FILA 2 */}
      <div>
        <label className="block mb-2 font-semibold">Forma de Entrega:</label>
        <select value={formaDeEntrega} onChange={e => setFormaDeEntrega(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600">
          <option>Retiro en planta</option><option>Despacho a obra</option>
        </select>
      </div>
      <div>
        <label className="block mb-2 font-semibold">2. Seleccione Obra/PDV</label>
        {/* Y esta línea también es válida ahora */}
        <Select instanceId="pdv-select" options={pdvOptions} value={pdvOptions.find(opt => opt.value === selectedPDV?.id) || null} onChange={onSelectPDV} styles={customSelectStyles} isDisabled={!selectedCompany} placeholder={selectedCompany ? "Buscar obra..." : "Seleccione una empresa primero"} isClearable />
      </div>

      {/* FILA 3 (SIEMPRE VISIBLE) */}
      <div>
        <label className="block mb-2 font-semibold">RUT</label>
        <input type="text" value={editableRut} onChange={e => setEditableRut(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600" />
      </div>
      <div>
        <label className="block mb-2 font-semibold">Dirección de Despacho</label>
        <input type="text" value={editableDireccion} onChange={e => setEditableDireccion(e.target.value)} className="w-full p-2.5 rounded bg-slate-700 border border-slate-600" />
      </div>

      {/* FILA 4 (SIEMPRE VISIBLE) */}
      <div className="md:col-span-2 pt-2">
         <a href="https://obras-gamma.vercel.app/" target="_blank" rel="noopener noreferrer" className="w-full block bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2.5 px-4 rounded text-center transition-transform duration-200 hover:scale-105">
           Al presionar este botón, será dirigido al "Radar", para crear el Punto de Venta
         </a>
      </div>
    </div>
  );
}
