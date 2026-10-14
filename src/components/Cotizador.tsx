'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { SingleValue, MultiValue } from 'react-select';
import Link from 'next/link';

import { ClientEntry, PyMProduct, CA_SKU, QuoteProduct, SelectOption, BankInfo, SellerContacts } from '@/types';
import { QuoteHeader, ClientSelector, ProductTable, QuoteTotals, ProductModal, ClientOnly } from '@/components/CotizadorComponents';
import { API_URL, fetchJsonWithRetry, computeTotals, validateProducts, ENTREGA_RETIRO, DIRECCION_RETIRO, COMUNA_RETIRO } from '@/lib/cotizacion';

type AllData = {
  clients?: ClientEntry[];
  products?: PyMProduct[];
  caSkus?: CA_SKU[];
  bankData?: BankInfo[];
  sellerContacts?: SellerContacts;
};

type SavedQuote = {
  status?: string;
  message?: string;
  selectedPDV?: ClientEntry;
  editableClientData?: { rut?: string; direccion?: string; comuna?: string };
  quoteProducts?: { code: string; description: string; quantity: number; currentPrice: number; basePrice?: number }[];
  paymentMethod?: string;
  deliveryMethod?: string;
};

const GENERIC_ID = 'GENERICO';

// Una sola pantalla para "Nueva cotización" (modo 'nuevo') y "Recuperar cotización" (modo 'recuperar').
export default function Cotizador({ modo }: { modo: 'nuevo' | 'recuperar' }) {
  const [formaDePago, setFormaDePago] = useState('Contado');
  const [formaDeEntrega, setFormaDeEntrega] = useState(ENTREGA_RETIRO);
  const [allClientEntries, setAllClientEntries] = useState<ClientEntry[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SelectOption | null>(null);
  const [selectedPDV, setSelectedPDV] = useState<ClientEntry | null>(null);

  const [editableRut, setEditableRut] = useState('');
  const [editableDireccion, setEditableDireccion] = useState('');
  const [editableComuna, setEditableComuna] = useState('');

  // Modo de cotización genérica (empresa escrita a mano, sin PDV)
  const [isGenericMode, setIsGenericMode] = useState(false);
  const [genericEmpresaName, setGenericEmpresaName] = useState('');
  const [genericVendedor, setGenericVendedor] = useState('');

  const [modalType, setModalType] = useState<'PyM' | 'CA' | null>(null);
  const [allPyMProducts, setAllPyMProducts] = useState<PyMProduct[]>([]);
  const [allCA_SKUs, setAllCA_SKUs] = useState<CA_SKU[]>([]);
  const [quoteProducts, setQuoteProducts] = useState<QuoteProduct[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bankData, setBankData] = useState<BankInfo[]>([]);
  const [sellerContacts, setSellerContacts] = useState<SellerContacts>({});

  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Solo para modo 'recuperar'
  const [searchId, setSearchId] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);

  // Una sola llamada combinada (?action=getAll) en vez de 5 llamadas separadas.
  const fetchData = useCallback(async () => {
    setLoadError(null);
    setIsLoadingData(true);
    try {
      const data = await fetchJsonWithRetry<AllData & { status?: string; message?: string }>(`${API_URL}?action=getAll`);
      if (data.status === 'error') throw new Error(data.message);
      setAllClientEntries(data.clients || []);
      setAllPyMProducts(data.products || []);
      setAllCA_SKUs(data.caSkus || []);
      setBankData(data.bankData || []);
      setSellerContacts(data.sellerContacts || {});
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setLoadError('No se pudieron cargar los datos iniciales. Revisa tu conexión o las Ejecuciones en Apps Script.');
    } finally {
      setIsLoadingData(false);
    }
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const resetClientFields = () => {
    setSelectedCompany(null);
    setSelectedPDV(null);
    setGenericEmpresaName('');
    setGenericVendedor('');
    setEditableRut('');
    setEditableDireccion('');
    setEditableComuna('');
  };

  const handleSelectCompany = (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => {
    const singleOption = Array.isArray(option) ? option[0] : option;
    setSelectedCompany(singleOption);
    setSelectedPDV(null);
    setEditableDireccion('');
    setEditableComuna('');
    // El RUT es el mismo para todas las obras de la empresa: se rellena al elegir la empresa.
    const matchingEntry = allClientEntries.find(c => c.empresa === singleOption?.value);
    setEditableRut(matchingEntry?.rut ? String(matchingEntry.rut) : '');
  };

  const handleSelectPDV = (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => {
    const singleOption = Array.isArray(option) ? option[0] : option;
    const fullPdvData = allClientEntries.find(c => String(c.id) === String(singleOption?.value));
    setSelectedPDV(fullPdvData || null);
    if (fullPdvData) {
      setEditableRut(String(fullPdvData.rut || ''));
      setEditableDireccion(String(fullPdvData.direccion || ''));
      setEditableComuna(String(fullPdvData.comuna || ''));
    }
  };

  const handleToggleGenericMode = (value: boolean) => {
    setIsGenericMode(value);
    resetClientFields();
  };

  // Con "Retiro en planta" la dirección es fija. La dirección del cliente se conserva aparte,
  // así reaparece si el vendedor cambia a "Despacho a obra".
  const esRetiro = formaDeEntrega === ENTREGA_RETIRO;
  const direccionEfectiva = esRetiro ? DIRECCION_RETIRO : editableDireccion;
  const comunaEfectiva = esRetiro ? COMUNA_RETIRO : editableComuna;

  // La lista de vendedores sale de "Correos", independiente de la carga de clientes.
  const vendedorOptions = useMemo(() => Object.keys(sellerContacts).sort(), [sellerContacts]);

  // "Cliente efectivo": el PDV seleccionado o uno armado con los datos del modo genérico.
  const effectivePDV: ClientEntry | null = isGenericMode
    ? (genericEmpresaName.trim() && genericVendedor.trim()
        ? {
            id: GENERIC_ID,
            empresa: genericEmpresaName.trim(),
            obraPDV: 'Cotización Genérica',
            vendedor: genericVendedor.trim(),
            direccion: direccionEfectiva,
            comuna: comunaEfectiva,
            region: '',
            rut: editableRut,
          }
        : null)
    : selectedPDV;

  // --- Recuperar una cotización guardada ---
  const handleLoadQuote = async () => {
    const id = searchId.trim();
    if (!id) return;
    setIsLoadingQuote(true);
    try {
      const data = await fetchJsonWithRetry<SavedQuote>(`${API_URL}?action=getQuote&id=${encodeURIComponent(id)}`, 1);
      if (data.status === 'error' || !data.selectedPDV) {
        alert(data.message || 'No se pudo leer la cotización.');
        return;
      }

      const pdv = data.selectedPDV;
      const client = data.editableClientData || {};

      if (String(pdv.id) === GENERIC_ID) {
        setIsGenericMode(true);
        setSelectedCompany(null);
        setSelectedPDV(null);
        setGenericEmpresaName(pdv.empresa || '');
        setGenericVendedor(pdv.vendedor || '');
      } else {
        setIsGenericMode(false);
        setGenericEmpresaName('');
        setGenericVendedor('');
        setSelectedCompany({ value: pdv.empresa, label: pdv.empresa });
        // Si el PDV sigue existiendo en la planilla, usamos sus datos actuales.
        const current = allClientEntries.find(c => String(c.id) === String(pdv.id));
        setSelectedPDV(current || pdv);
      }

      setEditableRut(String(client.rut ?? pdv.rut ?? ''));
      // Si la cotización guardada era de retiro, recuperamos la dirección real del cliente.
      const savedDireccion = String(client.direccion ?? '');
      setEditableDireccion(savedDireccion && savedDireccion !== DIRECCION_RETIRO ? savedDireccion : String(pdv.direccion ?? ''));
      const savedComuna = String(client.comuna ?? '');
      setEditableComuna(savedComuna && savedDireccion !== DIRECCION_RETIRO ? savedComuna : String(pdv.comuna ?? ''));
      setFormaDePago(data.paymentMethod || 'Contado');
      setFormaDeEntrega(data.deliveryMethod || ENTREGA_RETIRO);
      setQuoteProducts((data.quoteProducts || []).map(p => ({
        code: String(p.code ?? ''),
        description: String(p.description ?? ''),
        linea: 'PyM' as const,
        quantity: Number(p.quantity) || 0,
        currentPrice: Number(p.currentPrice) || 0,
        basePrice: Number(p.basePrice ?? p.currentPrice) || 0,
      })));

      alert(`✅ Datos de la cotización N° ${id} cargados. Modifica lo que necesites y genera una nueva.`);
    } catch (error) {
      console.error('Error recuperando cotización:', error);
      alert('Error de red al intentar recuperar la cotización.');
    } finally {
      setIsLoadingQuote(false);
    }
  };

  // --- Productos ---
  const handleSelectProduct = (productData: PyMProduct | CA_SKU) => {
    const code = String(productData.code);
    if (quoteProducts.some(p => String(p.code) === code)) {
      alert('Este producto ya ha sido agregado.'); return;
    }
    let newProduct: QuoteProduct;
    if ('productName' in productData) {
      const fullDescription = productData.observations ? `${productData.productName} - ${productData.observations}` : String(productData.productName);
      newProduct = { code, description: fullDescription, linea: 'PyM', quantity: 1, currentPrice: Number(productData.basePrice) || 0, basePrice: Number(productData.basePrice) || 0, originalData: productData };
    } else {
      newProduct = { code, description: `${productData.modelo} - ${productData.color}`, linea: 'CA', quantity: 1, currentPrice: Number(productData.basePrice) || 0, basePrice: Number(productData.basePrice) || 0, originalData: productData };
    }
    setQuoteProducts(prev => [...prev, newProduct]);
    setModalType(null);
  };

  const handlePriceChange = (code: string, newPrice: number) => {
    setQuoteProducts(prev => prev.map(p => p.code === code ? { ...p, currentPrice: newPrice } : p));
  };

  const handleQuantityChange = (code: string, newQuantity: number) => {
    setQuoteProducts(prev => prev.map(p => p.code === code ? { ...p, quantity: Math.max(0, newQuantity) } : p));
  };

  const handleDeleteProduct = (code: string) => {
    setQuoteProducts(prev => prev.filter(p => p.code !== code));
  };

  const { subtotal, iva, total } = computeTotals(quoteProducts);

  // --- Generar ---
  const handleGenerateQuote = async () => {
    if (!effectivePDV) {
      alert(isGenericMode
        ? 'Por favor, escriba el nombre de la empresa y seleccione el vendedor.'
        : 'Por favor, seleccione una Empresa y una Obra/PDV.');
      return;
    }
    if (quoteProducts.length === 0) { alert('Por favor, agregue al menos un producto.'); return; }

    // Validar antes de abrir la ventana del PDF, para no dejar una ventana vacía.
    const problem = validateProducts(quoteProducts);
    if (problem) { alert(problem); return; }

    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Generando PDF...</h2><p>Espera un momento por favor.</p></body></html>');
    }

    setIsGenerating(true);

    try {
      const sellerContact = sellerContacts[String(effectivePDV.vendedor).trim()] || { email: '', phone: '' };
      const quoteData = {
        selectedPDV: effectivePDV,
        editableClientData: { rut: editableRut, direccion: direccionEfectiva, comuna: comunaEfectiva },
        quoteProducts: quoteProducts.map(p => ({
          code: p.code, description: p.description, quantity: p.quantity,
          currentPrice: p.currentPrice, basePrice: p.basePrice
        })),
        sellerContact,
        subtotal, iva, total,
        paymentMethod: formaDePago, deliveryMethod: formaDeEntrega,
        bankInfo: bankData.length > 0 ? bankData[0] : {}
      };

      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(quoteData)
      });

      const responseText = await response.text();
      let result: { status?: string; message?: string; pdfUrl?: string; quoteNumber?: number };
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error('Respuesta no válida del servidor:', responseText);
        throw new Error("El servidor no respondió correctamente. Puede estar caído, sin permisos, o con una implementación desactualizada. Revisa 'Ejecuciones' en Apps Script.");
      }

      if (result.status === 'success' && result.pdfUrl) {
        const downloadUrl = result.pdfUrl;

        if (pdfWindow) {
          const fileIdMatch = downloadUrl.match(/id=([a-zA-Z0-9_-]+)/);
          pdfWindow.location.href = fileIdMatch
            ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
            : downloadUrl;
        }

        setTimeout(() => {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = `Cotizacion_${result.quoteNumber}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 1000);
      } else {
        throw new Error(result.message || 'Error del servidor');
      }
    } catch (error) {
      pdfWindow?.close();
      console.error('Error generando cotización:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido.';
      alert('Error al generar cotización: ' + message.replace(/^Error:\s*/, ''));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className={`p-4 md:p-10 bg-slate-800 text-white min-h-screen ${modo === 'recuperar' ? 'border-t-8 border-orange-500' : ''}`}>

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <QuoteHeader />

        {modo === 'nuevo' ? (
          <Link
            href="/recuperar"
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-orange-500 text-orange-400 font-bold py-2 px-4 rounded shadow-md transition-colors"
          >
            <span>🔄 Ir a Recuperar Cotización</span>
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-700 p-3 rounded-lg border border-orange-500 shadow-md">
              <span className="font-bold text-orange-400 whitespace-nowrap">Recuperar:</span>
              <input
                type="number"
                placeholder="Ej. 145"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="w-full md:w-28 p-2 bg-slate-800 text-white rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
                onKeyDown={(e) => e.key === 'Enter' && handleLoadQuote()}
              />
              <button
                onClick={handleLoadQuote}
                disabled={isLoadingQuote || !searchId.trim() || isLoadingData}
                className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-500 text-white font-bold py-2 px-4 rounded"
              >
                {isLoadingQuote ? '...' : 'Cargar'}
              </button>
            </div>
            <Link href="/" className="text-center text-slate-300 hover:text-white underline">
              ← Nueva cotización
            </Link>
          </div>
        )}
      </div>

      {loadError && (
        <div className="mb-6 p-3 bg-red-900/50 border border-red-600 rounded text-red-200 flex items-center justify-between">
          <span>{loadError}</span>
          <button onClick={fetchData} className="underline font-semibold ml-4">Reintentar</button>
        </div>
      )}

      <ClientOnly>
        <ClientSelector
          allClientEntries={allClientEntries}
          selectedCompany={selectedCompany}
          selectedPDV={selectedPDV}
          onSelectCompany={handleSelectCompany}
          onSelectPDV={handleSelectPDV}
          formaDePago={formaDePago}
          setFormaDePago={setFormaDePago}
          formaDeEntrega={formaDeEntrega}
          setFormaDeEntrega={setFormaDeEntrega}
          editableRut={editableRut}
          setEditableRut={setEditableRut}
          editableDireccion={direccionEfectiva}
          direccionBloqueada={esRetiro}
          setEditableDireccion={setEditableDireccion}
          editableComuna={comunaEfectiva}
          setEditableComuna={setEditableComuna}
          isGenericMode={isGenericMode}
          onToggleGenericMode={handleToggleGenericMode}
          genericEmpresaName={genericEmpresaName}
          setGenericEmpresaName={setGenericEmpresaName}
          vendedorOptions={vendedorOptions}
          genericVendedor={genericVendedor}
          setGenericVendedor={setGenericVendedor}
        />
      </ClientOnly>
      <hr className="border-slate-600 my-10" />
      {effectivePDV && (
        <div className="mb-10 flex flex-col md:flex-row gap-4">
          <button onClick={() => setModalType('PyM')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded text-lg">Agregar Producto PyM</button>
          <button onClick={() => setModalType('CA')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-5 rounded text-lg">Agregar Producto CA</button>
        </div>
      )}
      <ProductTable products={quoteProducts} onQuantityChange={handleQuantityChange} onPriceChange={handlePriceChange} onDelete={handleDeleteProduct} />
      <QuoteTotals subtotal={subtotal} iva={iva} total={total} isGenerating={isGenerating} isClientSelected={!!effectivePDV} onGenerateQuote={handleGenerateQuote} />
      {modalType && <ProductModal modalType={modalType} onClose={() => setModalType(null)} allPyMProducts={allPyMProducts} allCA_SKUs={allCA_SKUs} onSelectProduct={handleSelectProduct} />}
    </main>
  );
}
