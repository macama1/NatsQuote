// src/types/index.ts

export type ClientEntry = {
  id: string;
  empresa: string;
  obraPDV: string;
  vendedor: string;
  direccion: string;
  comuna: string;
  region: string;
  rut: string;
};

export type PyMProduct = {
  code: string;
  productName: string;
  observations: string;
  basePrice: number;
};

export type CA_SKU = {
  modelo: string;
  color: string;
  code: string;
  basePrice: number;
  linea: 'CA';
};

export type QuoteProduct = {
  code: string;
  description: string;
  linea: 'PyM' | 'CA';
  quantity: number;
  currentPrice: number;
  originalData: PyMProduct | CA_SKU; // <-- CORRECCIÓN APLICADA AQUÍ
};

export type SelectOption = { 
  value: string; 
  label: string; 
};

export type BankInfo = {
  banco: string;
  cuenta: string;
  nombre: string;
  rut: string;
};

export type SellerContacts = {
  [key: string]: {
    email: string;
    phone: string;
  };
};