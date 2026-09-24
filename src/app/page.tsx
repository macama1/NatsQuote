'use client';
import { useState, useEffect, useMemo } from 'react';
import { SingleValue, MultiValue } from 'react-select';
import Link from 'next/link';

import { ClientEntry, PyMProduct, CA_SKU, QuoteProduct, SelectOption, BankInfo, SellerContacts } from '@/types';
import { QuoteHeader, ClientSelector, ProductTable, QuoteTotals, ProductModal, ClientOnly } from '@/components/CotizadorComponents';

const API_URL = 'https://script.google.com/macros/s/AKfycbyxd8jZhYGbJJRh2dkWa4e8kvHE1NsO9zf9HnvASPOog2d3y5QIsyPkt-t-fl8FaT6bKQ/exec';

// <-- NUEVO: fetch con reintentos (fallas transitorias de Apps Script no deberían bloquear la carga)
async function fetchJsonWithRetry(url: string, retries = 2, delayMs = 1200): Promise<any> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      try {
        return JSON.parse(text);
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

export default function CotizadorPage() {
  const [formaDePago, setFormaDePago] = useState('Contado');
  const [formaDeEntrega, setFormaDeEntrega] = useState('Retiro en planta');
  const [allClientEntries, setAllClientEntries] = useState<ClientEntry[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SelectOption | null>(null);
  const [selectedPDV, setSelectedPDV] = useState<ClientEntry | null>(null);

  const [editableRut, setEditableRut] = useState('');
  const [editableDireccion, setEditableDireccion] = useState('');
  const [editableComuna, setEditableComuna] = useState('');

  // <-- NUEVO: modo de cotización genérica (empresa escrita a mano, sin PDV)
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

  // <-- NUEVO: estado de error de carga, visible para el usuario
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoadError(null);

    const [clientsResult, productsResult, caResult, bankResult, sellerResult] = await Promise.allSettled([
      fetchJsonWithRetry(`${API_URL}`),
      fetchJsonWithRetry(`${API_URL}?action=getProducts`),
      fetchJsonWithRetry(`${API_URL}?action=getCA_SKUs`),
      fetchJsonWithRetry(`${API_URL}?action=getBankData`),
      fetchJsonWithRetry(`${API_URL}?action=getSellerContacts`),
    ]);

    const failed: string[] = [];

    if (clientsResult.status === 'fulfilled') setAllClientEntries(clientsResult.value);
    else { console.error("Error fetching clients:", clientsResult.reason); failed.push("clientes"); }

    if (productsResult.status === 'fulfilled') setAllPyMProducts(productsResult.value);
    else { console.error("Error fetching PyM products:", productsResult.reason); failed.push("productos PyM"); }

    if (caResult.status === 'fulfilled') setAllCA_SKUs(caResult.value);
    else { console.error("Error fetching CA SKUs:", caResult.reason); failed.push("productos CA"); }

    if (bankResult.status === 'fulfilled') setBankData(bankResult.value);
    else console.error("Error fetching bank data:", bankResult.reason);

    if (sellerResult.status === 'fulfilled') setSellerContacts(sellerResult.value);
    else { console.error("Error fetching seller contacts:", sellerResult.reason); failed.push("vendedores"); }

    if (failed.length > 0) {
      setLoadError(`No se pudo cargar: ${failed.join(', ')}. (Reintentado automáticamente sin éxito — revisa las Ejecuciones en Apps Script)`);
    }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSelectCompany = (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => {
    const singleOption = Array.isArray(option) ? option[0] : option;
    setSelectedCompany(singleOption);
    setSelectedPDV(null);
    setEditableRut('');
    setEditableDireccion('');
    setEditableComuna('');
  };

  const handleSelectPDV = (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => {
    const singleOption = Array.isArray(option) ? option[0] : option;
    const fullPdvData = allClientEntries.find(c => c.id === singleOption?.value);
    setSelectedPDV(fullPdvData || null);
    if (fullPdvData) {
      setEditableRut(fullPdvData.rut || '');
      setEditableDireccion(fullPdvData.direccion || '');
      // <-- CORREGIDO: ya no hace falta "as any", ClientEntry ya tiene "comuna: string"
      setEditableComuna(fullPdvData.comuna || '');
    }
  };

  const handleToggleGenericMode = (value: boolean) => {
    setIsGenericMode(value);
    setSelectedCompany(null);
    setSelectedPDV(null);
    setGenericEmpresaName('');
    setGenericVendedor('');
    setEditableRut('');
    setEditableDireccion('');
    setEditableComuna('');
  };

  // <-- CORREGIDO: la lista de vendedores ahora sale de "sellerContacts" (independiente
  // de la carga de clientes), así el modo genérico sigue funcionando aunque falle getClients
  const vendedorOptions = useMemo(() =>
    Object.keys(sellerContacts).sort()
  , [sellerContacts]);

  // <-- NUEVO: "cliente efectivo" para la cotización, ya sea el PDV seleccionado
  // o uno sintético armado a partir del nombre y vendedor escritos/elegidos en modo genérico
  const effectivePDV: ClientEntry | null = isGenericMode
    ? (genericEmpresaName.trim() && genericVendedor.trim()
        ? {
            id: 'GENERICO',
            empresa: genericEmpresaName.trim(),
            obraPDV: 'Cotización Genérica',
            vendedor: genericVendedor.trim(),
            direccion: editableDireccion,
            comuna: editableComuna,
            region: '',
            rut: editableRut,
          }
        : null)
    : selectedPDV;

  const handleSelectProduct = (productData: PyMProduct | CA_SKU) => {
    if (quoteProducts.find(p => p.code === productData.code)) {
      alert("Este producto ya ha sido agregado."); return;
    }
    let newProduct: QuoteProduct;
    if ('productName' in productData) {
      const fullDescription = productData.observations ? `${productData.productName} - ${productData.observations}` : productData.productName;
      newProduct = { code: productData.code, description: fullDescription, linea: 'PyM', quantity: 1, currentPrice: productData.basePrice, originalData: productData };
    } else {
      newProduct = { code: productData.code, description: `${productData.modelo} - ${productData.color}`, linea: 'CA', quantity: 1, currentPrice: productData.basePrice || 0, originalData: productData };
    }
    setQuoteProducts(prev => [...prev, newProduct]);
    setModalType(null);
  };

  const handlePriceChange = (code: string, newPrice: number) => {
    setQuoteProducts(quoteProducts.map(p => p.code === code ? { ...p, currentPrice: newPrice } : p));
  };

  const handleQuantityChange = (code: string, newQuantity: number) => {
    setQuoteProducts(quoteProducts.map(p => {
      if (p.code !== code) return p;
      return { ...p, quantity: Math.max(0, newQuantity) };
    }));
  };

  const handleDeleteProduct = (code: string) => {
    setQuoteProducts(quoteProducts.filter(p => p.code !== code));
  };

  const handleGenerateQuote = async () => {
    if (!effectivePDV) {
      alert(isGenericMode
        ? "Por favor, escriba el nombre de la empresa y seleccione el vendedor."
        : "Por favor, seleccione una Empresa y una Obra/PDV.");
      return;
    }
    if (quoteProducts.length === 0) { alert("Por favor, agregue al menos un producto."); return; }

    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) {
      pdfWindow.document.write('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Generando PDF...</h2><p>Espera un momento por favor.</p></body></html>');
    }

    setIsGenerating(true);

    try {
      const sellerContact = sellerContacts[effectivePDV.vendedor.trim()] || { email: '', phone: '' };
      const quoteData = {
        selectedPDV: effectivePDV,
        editableClientData: {
          rut: editableRut,
          direccion: editableDireccion,
          comuna: editableComuna
        },
        quoteProducts: quoteProducts.map(p => ({
          code: p.code, description: p.description, quantity: p.quantity,
          currentPrice: p.currentPrice, basePrice: p.originalData.basePrice
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
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error("Respuesta no válida del servidor:", responseText);
        throw new Error("El servidor no respondió correctamente. Puede estar caído, sin permisos, o con una implementación desactualizada. Revisa 'Ejecuciones' en Apps Script.");
      }

      if (result.status === 'success') {
        const downloadUrl = result.pdfUrl;

        if (pdfWindow) {
          const fileIdMatch = downloadUrl.match(/id=([a-zA-Z0-9_-]+)/);
          if (fileIdMatch) {
            pdfWindow.location.href = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
          } else {
            pdfWindow.location.href = downloadUrl;
          }
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
    } catch (error: any) {
      pdfWindow?.close();
      console.error("Error generando cotización:", error);
      alert("Error al generar cotización: " + (error?.message || 'Error desconocido.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const subtotal = quoteProducts.reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  return (
    <main className="p-4 md:p-10 bg-slate-800 text-white min-h-screen">

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <QuoteHeader />

        <Link
          href="/recuperar"
          className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-orange-500 text-orange-400 font-bold py-2 px-4 rounded shadow-md transition-colors"
        >
          <span>🔄 Ir a Recuperar Cotización</span>
        </Link>
      </div>

      {/* <-- NUEVO: aviso visible si falla la carga de datos */}
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
          editableDireccion={editableDireccion}
          setEditableDireccion={setEditableDireccion}
          editableComuna={editableComuna}
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
