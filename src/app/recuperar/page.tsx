'use client';
import { useState, useEffect } from 'react';
import { SingleValue, MultiValue } from 'react-select'; 
import { ClientEntry, PyMProduct, CA_SKU, QuoteProduct, SelectOption, BankInfo, SellerContacts } from '@/types';
import QuoteHeader from '@/components/QuoteHeader';
import ClientSelector from '@/components/ClientSelector';
import ProductTable from '@/components/ProductTable';
import QuoteTotals from '@/components/QuoteTotals';
import ProductModal from '@/components/ProductModal';
import ClientOnly from '@/components/ClientOnly';

// Revisa que esta URL sea exactamente la de tu AppScript activa
const API_URL = 'https://script.google.com/macros/s/AKfycbyxd8jZhYGbJJRh2dkWa4e8kvHE1NsO9zf9HnvASPOog2d3y5QIsyPkt-t-fl8FaT6bKQ/exec';

export default function RecuperarCotizacionPage() {
  const [formaDePago, setFormaDePago] = useState('Contado');
  const [formaDeEntrega, setFormaDeEntrega] = useState('Retiro en planta');
  const [allClientEntries, setAllClientEntries] = useState<ClientEntry[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SelectOption | null>(null);
  const [selectedPDV, setSelectedPDV] = useState<ClientEntry | null>(null);
  
  const [editableRut, setEditableRut] = useState('');
  const [editableDireccion, setEditableDireccion] = useState('');
  const [editableComuna, setEditableComuna] = useState('');
  
  const [modalType, setModalType] = useState<'PyM' | 'CA' | null>(null);
  const [allPyMProducts, setAllPyMProducts] = useState<PyMProduct[]>([]);
  const [allCA_SKUs, setAllCA_SKUs] = useState<CA_SKU[]>([]);
  const [quoteProducts, setQuoteProducts] = useState<QuoteProduct[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bankData, setBankData] = useState<BankInfo[]>([]);
  const [sellerContacts, setSellerContacts] = useState<SellerContacts>({});

  // ESTADOS PARA LA BÚSQUEDA
  const [searchId, setSearchId] = useState('');
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  
  // SOLUCIÓN CRÍTICA: Peticiones en orden (fila india) para no saturar Google Apps Script
  const fetchData = async () => {
    try {
      // 1. Cargar Clientes
      const resClients = await fetch(`${API_URL}`);
      const dataClients = await resClients.json();
      setAllClientEntries(dataClients);

      // 2. Cargar Productos PyM
      const resProducts = await fetch(`${API_URL}?action=getProducts`);
      const dataProducts = await resProducts.json();
      setAllPyMProducts(dataProducts);

      // 3. Cargar SKUs CA
      const resCA = await fetch(`${API_URL}?action=getCA_SKUs`);
      const dataCA = await resCA.json();
      setAllCA_SKUs(dataCA);

      // 4. Cargar Datos Banco
      const resBank = await fetch(`${API_URL}?action=getBankData`);
      const dataBank = await resBank.json();
      setBankData(dataBank);

      // 5. Cargar Contactos Vendedor
      const resContacts = await fetch(`${API_URL}?action=getSellerContacts`);
      const dataContacts = await resContacts.json();
      setSellerContacts(dataContacts);

    } catch (err) {
      console.error("Error cargando los datos secuencialmente:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // LÓGICA PARA IR A BUSCAR LA COTIZACIÓN VIEJA
  const handleLoadQuote = async () => {
    if (!searchId) return;
    setIsLoadingQuote(true);
    try {
      const res = await fetch(`${API_URL}?action=getQuote&id=${searchId}`);
      const data = await res.json();
      
      if (data.status === 'error') {
        alert(data.message);
        return;
      }

      // Inyectamos los datos viejos en el estado de la pantalla actual
      setSelectedCompany({ value: data.selectedPDV.empresa, label: data.selectedPDV.empresa });
      setSelectedPDV(data.selectedPDV);
      setEditableRut(data.editableClientData?.rut || '');
      setEditableDireccion(data.editableClientData?.direccion || '');
      setEditableComuna(data.editableClientData?.comuna || '');
      setFormaDePago(data.paymentMethod || 'Contado');
      setFormaDeEntrega(data.deliveryMethod || 'Retiro en planta');
      setQuoteProducts(data.quoteProducts || []);
      
      alert(`✅ Datos de la cotización N° ${searchId} cargados. Modifica lo que necesites y genera una nueva.`);
    } catch (error) {
      alert("Error de red al intentar recuperar la cotización.");
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleSelectCompany = (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => {
    const singleOption = Array.isArray(option) ? option[0] : option;
    setSelectedCompany(singleOption);
    setSelectedPDV(null);
    setEditableRut(''); setEditableDireccion(''); setEditableComuna('');
  };

  const handleSelectPDV = (option: SingleValue<SelectOption> | MultiValue<SelectOption>) => {
    const singleOption = Array.isArray(option) ? option[0] : option;
    const fullPdvData = allClientEntries.find(c => c.id === singleOption?.value);
    setSelectedPDV(fullPdvData || null);
    if (fullPdvData) {
      setEditableRut(fullPdvData.rut || '');
      setEditableDireccion(fullPdvData.direccion || '');
      setEditableComuna((fullPdvData as any).comuna || '');
    }
  };

  const handleSelectProduct = (productData: PyMProduct | CA_SKU) => {
    if (quoteProducts.find(p => p.code === productData.code)) { alert("Este producto ya ha sido agregado."); return; }
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
  
  const handlePriceChange = (code: string, newPrice: number) => setQuoteProducts(quoteProducts.map(p => p.code === code ? { ...p, currentPrice: newPrice } : p));
  const handleQuantityChange = (code: string, newQuantity: number) => setQuoteProducts(quoteProducts.map(p => p.code === code ? { ...p, quantity: Math.max(0, newQuantity) } : p));
  const handleDeleteProduct = (code: string) => setQuoteProducts(quoteProducts.filter(p => p.code !== code));

  const handleGenerateQuote = async () => { 
    if (!selectedPDV) { alert("Seleccione Empresa y Obra/PDV."); return; }
    if (quoteProducts.length === 0) { alert("Agregue al menos un producto."); return; }
    
    const pdfWindow = window.open('', '_blank');
    if (pdfWindow) pdfWindow.document.write('<html><body style="font-family:sans-serif;text-align:center;padding:50px;"><h2>Generando PDF...</h2></body></html>');
    setIsGenerating(true);

    try {
      const quoteData = {
        selectedPDV,
        editableClientData: { rut: editableRut, direccion: editableDireccion, comuna: editableComuna },
        quoteProducts: quoteProducts.map(p => ({ code: p.code, description: p.description, quantity: p.quantity, currentPrice: p.currentPrice, basePrice: p.originalData.basePrice })),
        sellerContact: sellerContacts[selectedPDV.vendedor.trim()] || { email: '', phone: '' },
        subtotal, iva, total, paymentMethod: formaDePago, deliveryMethod: formaDeEntrega,
        bankInfo: bankData.length > 0 ? bankData[0] : {}
      };

      const response = await fetch(API_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(quoteData) });
      const result = JSON.parse(await response.text());

      if (result.status === 'success') {
        const downloadUrl = result.pdfUrl;
        if (pdfWindow) {
            const fileIdMatch = downloadUrl.match(/id=([a-zA-Z0-9_-]+)/);
            pdfWindow.location.href = fileIdMatch ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview` : downloadUrl;
        }
        setTimeout(() => {
            const link = document.createElement('a'); link.href = downloadUrl; link.download = `Cotizacion_${result.quoteNumber}.pdf`; 
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
        }, 1000);
      } else throw new Error(result.message || 'Error del servidor');
    } catch (error: any) {
      pdfWindow?.close(); alert("Error: " + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const subtotal = quoteProducts.reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  return (
    <main className="p-4 md:p-10 bg-slate-800 text-white min-h-screen border-t-8 border-orange-500">
      
      {/* HEADER VISUAL DIFERENCIADO */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
        <QuoteHeader />
        <div className="flex items-center gap-2 bg-slate-700 p-3 rounded-lg border border-orange-500 shadow-md w-full md:w-auto">
          <span className="font-bold text-orange-400 whitespace-nowrap">Recuperar N°:</span>
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
            disabled={isLoadingQuote || !searchId}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-500 text-white font-bold py-2 px-4 rounded"
          >
            {isLoadingQuote ? '...' : 'Cargar'}
          </button>
        </div>
      </div>

      <ClientOnly>
        <ClientSelector
          allClientEntries={allClientEntries} selectedCompany={selectedCompany} selectedPDV={selectedPDV}
          onSelectCompany={handleSelectCompany} onSelectPDV={handleSelectPDV}
          formaDePago={formaDePago} setFormaDePago={setFormaDePago} formaDeEntrega={formaDeEntrega} setFormaDeEntrega={setFormaDeEntrega}
          editableRut={editableRut} setEditableRut={setEditableRut} editableDireccion={editableDireccion} setEditableDireccion={setEditableDireccion}
          editableComuna={editableComuna} setEditableComuna={setEditableComuna} 
        />
      </ClientOnly>
      <hr className="border-slate-600 my-10" />
      {selectedPDV && (
        <div className="mb-10 flex flex-col md:flex-row gap-4">
          <button onClick={() => setModalType('PyM')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded text-lg">Agregar Producto PyM</button>
          <button onClick={() => setModalType('CA')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-5 rounded text-lg">Agregar Producto CA</button>
        </div>
      )}
      <ProductTable products={quoteProducts} onQuantityChange={handleQuantityChange} onPriceChange={handlePriceChange} onDelete={handleDeleteProduct} />
      <QuoteTotals subtotal={subtotal} iva={iva} total={total} isGenerating={isGenerating} isClientSelected={!!selectedPDV} onGenerateQuote={handleGenerateQuote} />
      {modalType && <ProductModal modalType={modalType} onClose={() => setModalType(null)} allPyMProducts={allPyMProducts} allCA_SKUs={allCA_SKUs} onSelectProduct={handleSelectProduct} />}
    </main>
  );
}
