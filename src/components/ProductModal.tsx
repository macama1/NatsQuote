'use client';
import { useState, useMemo } from 'react';
import { PyMProduct, CA_SKU } from '@/types';

// El componente Modal base
const Modal = ({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string; }) => (
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

type ProductModalProps = {
  modalType: 'PyM' | 'CA';
  onClose: () => void;
  allPyMProducts: PyMProduct[];
  allCA_SKUs: CA_SKU[];
  onSelectProduct: (product: PyMProduct | CA_SKU) => void;
};

export default function ProductModal({ modalType, onClose, allPyMProducts, allCA_SKUs, onSelectProduct }: ProductModalProps) {
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

