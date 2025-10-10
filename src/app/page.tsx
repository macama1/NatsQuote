'use client';
import { useState, useEffect } from 'react';
import { SingleValue } from 'react-select';

// Importa los componentes y los tipos
import { ClientEntry, PyMProduct, CA_SKU, QuoteProduct, SelectOption, BankInfo, SellerContacts } from '@/types';
import QuoteHeader from '@/components/QuoteHeader';
import ClientSelector from '@/components/ClientSelector';
import ProductTable from '@/components/ProductTable';
import QuoteTotals from '@/components/QuoteTotals';
import ProductModal from '@/components/ProductModal';
import ClientOnly from '@/components/ClientOnly';

const API_URL = 'https://script.google.com/macros/s/AKfycbwg3jS0LHNTnP7F7RIx7fO0QF0t5cdxAKKxNypHYzcEnpgpvkUmeM1FojAAjIYp0QY5Pg/exec';

export default function CotizadorPage() {
  const [formaDePago, setFormaDePago] = useState('Contado');
  const [formaDeEntrega, setFormaDeEntrega] = useState('Retiro en planta');
  const [allClientEntries, setAllClientEntries] = useState<ClientEntry[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<SelectOption | null>(null);
  const [selectedPDV, setSelectedPDV] = useState<ClientEntry | null>(null);
  
  // Estados para los campos editables de RUT y Dirección
  const [editableRut, setEditableRut] = useState('');
  const [editableDireccion, setEditableDireccion] = useState('');
  
  const [modalType, setModalType] = useState<'PyM' | 'CA' | null>(null);
  const [allPyMProducts, setAllPyMProducts] = useState<PyMProduct[]>([]);
  const [allCA_SKUs, setAllCA_SKUs] = useState<CA_SKU[]>([]);
  const [quoteProducts, setQuoteProducts] = useState<QuoteProduct[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bankData, setBankData] = useState<BankInfo[]>([]);
  const [sellerContacts, setSellerContacts] = useState<SellerContacts>({});
  
  const fetchData = () => {
    fetch(`${API_URL}`).then(res => res.json()).then(setAllClientEntries).catch(err => console.error("Error fetching clients:", err));
    fetch(`${API_URL}?action=getProducts`).then(res => res.json()).then(setAllPyMProducts).catch(err => console.error("Error fetching PyM products:", err));
    fetch(`${API_URL}?action=getCA_SKUs`).then(res => res.json()).then(setAllCA_SKUs).catch(err => console.error("Error fetching CA SKUs:", err));
    fetch(`${API_URL}?action=getBankData`).then(res => res.json()).then(setBankData).catch(err => console.error("Error fetching bank data:", err));
    fetch(`${API_URL}?action=getSellerContacts`).then(res => res.json()).then(setSellerContacts).catch(err => console.error("Error fetching seller contacts:", err));
  };
  useEffect(fetchData, []);

  const handleSelectCompany = (option: SingleValue<SelectOption>) => {
    setSelectedCompany(option);
    setSelectedPDV(null);
    // Limpia los campos editables al cambiar de empresa
    setEditableRut('');
    setEditableDireccion('');
  };

  const handleSelectPDV = (option: SingleValue<SelectOption>) => {
    const fullPdvData = allClientEntries.find(c => c.id === option?.value);
    setSelectedPDV(fullPdvData || null);
    // Al seleccionar un PDV, se actualizan los campos editables
    if (fullPdvData) {
      setEditableRut(fullPdvData.rut || '');
      setEditableDireccion(fullPdvData.direccion || '');
    }
  };

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
      let finalPrice = p.currentPrice;
      if (p.linea === 'CA' && p.originalData.basePrice > 0) {
        const basePrice = p.originalData.basePrice;
        let discount = 0;
        if (newQuantity >= 500) discount = 0.20; else if (newQuantity >= 300) discount = 0.15; else if (newQuantity >= 100) discount = 0.10; else if (newQuantity >= 50) discount = 0.03;
        if (p.originalData.modelo === 'HORMIGÓN A LA VISTA TABLEADO') discount = Math.min(discount, 0.10);
        finalPrice = basePrice * (1 - discount);
      }
      return { ...p, quantity: Math.max(0, newQuantity), currentPrice: finalPrice };
    }));
  };

  const handleDeleteProduct = (code: string) => {
    setQuoteProducts(quoteProducts.filter(p => p.code !== code));
  };

  const handleGenerateQuote = async () => { 
    if (!selectedPDV) { alert("Por favor, seleccione una Empresa y una Obra/PDV."); return; }
    if (quoteProducts.length === 0) { alert("Por favor, agregue al menos un producto."); return; }
    setIsGenerating(true);

    try {
      const sellerContact = sellerContacts[selectedPDV.vendedor.trim()] || { email: '', phone: '' };

      const quoteData = {
        selectedPDV,
        // Se envían los datos editables para usarlos en el PDF
        editableClientData: {
          rut: editableRut,
          direccion: editableDireccion
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
        method: 'POST', redirect: "follow",
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(quoteData)
      });
      
      const result = await response.json();

      if (result.status === 'success') {
        alert(`¡Cotización N° ${result.quoteNumber} registrada y generada con éxito!`);
        window.open(result.pdfUrl, '_blank');
      } else {
        console.error("Server error details:", result);
        throw new Error(result.message || 'Error desconocido del servidor.');
      }
    } catch (error: any) {
      alert(`Hubo un problema al generar la cotización: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const subtotal = quoteProducts.reduce((sum, p) => sum + (p.currentPrice * p.quantity), 0);
  const iva = subtotal * 0.19;
  const total = subtotal + iva;

  return (
    <main className="p-4 md:p-10 bg-slate-800 text-white min-h-screen">
      <QuoteHeader />
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
          // Se pasan las props para los campos editables
          editableRut={editableRut}
          setEditableRut={setEditableRut}
          editableDireccion={editableDireccion}
          setEditableDireccion={setEditableDireccion}
        />
      </ClientOnly>
      <hr className="border-slate-600 my-10" />
      {selectedPDV && (
        <div className="mb-10 flex flex-col md:flex-row gap-4">
          <button onClick={() => setModalType('PyM')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-5 rounded text-lg">Agregar Producto PyM</button>
          <button onClick={() => setModalType('CA')} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-5 rounded text-lg">Agregar Producto CA</button>
        </div>
      )}
      <ProductTable {...{products: quoteProducts, onQuantityChange: handleQuantityChange, onPriceChange: handlePriceChange, onDelete: handleDeleteProduct}} />
      <QuoteTotals {...{subtotal, iva, total, isGenerating, isClientSelected: !!selectedPDV, onGenerateQuote: handleGenerateQuote}} />
      {modalType && <ProductModal {...{modalType, onClose: () => setModalType(null), allPyMProducts, allCA_SKUs, onSelectProduct: handleSelectProduct}} />}
    </main>
  );
}

