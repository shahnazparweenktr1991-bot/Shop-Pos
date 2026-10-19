export type UnitType = 
  | 'pieces' 
  | 'tins' 
  | 'litres' 
  | 'kilograms' 
  | 'bags' 
  | 'boxes' 
  | 'metres' 
  | string;

export interface Subcategory {
  id: string;
  name: string;
  imageUrl?: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  subcategories?: Subcategory[];
  isSample?: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  code: string; // SKU / Product Code
  name: string;
  brand: string;
  categoryId: string;
  subcategoryId?: string;
  subcategoryName?: string;
  imageUrl?: string; // photo of product in stock
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  minStock: number;
  unit: UnitType;
  packageSize: string; // e.g. "1 Litre", "4 Litres", "20 Litres", "20 kg", "1 pc"
  gstRate?: number; // 0, 5, 12, 18, 28
  hsnCode?: string;
  isTaxInclusive?: boolean; // true = sellingPrice includes GST
  secondaryUnit?: string; // e.g. "pieces"
  conversionRatio?: number; // e.g. 24 pieces per box
  supplierId?: string;
  supplierName?: string;
  notes?: string;
  isSample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  productCode: string;
  brand: string;
  unit: string;
  packageSize: string;
  quantity: number;
  purchasePrice: number; // Historical cost at the time of sale
  sellingPrice: number;  // Price charged per unit
  totalPrice: number;    // quantity * sellingPrice
  gstRate?: number;      // e.g. 18
  hsnCode?: string;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
}

export type SaleType = 'itemised' | 'amount_only';
export type SaleStatus = 'draft' | 'finalised' | 'cancelled';
export type PaymentMethod = 'cash' | 'upi' | 'credit' | 'bank_transfer' | 'cheque';

export interface Sale {
  id: string;
  billNumber: string;
  date: string; // ISO date
  type: SaleType;
  status: SaleStatus;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  taxableAmount?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  roundOff?: number;
  totalAmount: number;
  amountReceived: number;
  remainingBalance: number;
  paymentMethod: PaymentMethod;
  isInterState?: boolean;
  notes?: string;
  stockDeducted: boolean; // True only if stock has been subtracted exactly once
  isSample?: boolean;
  createdAt: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  date: string;
  supplierId?: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  purchasePrice: number;
  gstRate?: number;
  taxAmount?: number;
  isTaxInclusive?: boolean;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  notes?: string;
  isSample?: boolean;
  createdAt: string;
}

export type ContactProfession = 
  | 'karigar'
  | 'painter' 
  | 'contractor' 
  | 'customer' 
  | 'electrician' 
  | 'plumber' 
  | 'carpenter'
  | 'mason'
  | 'supplier' 
  | 'other';

export interface Contact {
  id: string;
  name: string;
  phone: string;
  alternatePhone?: string;
  profession: ContactProfession | string;
  customProfession?: string;
  location: string;
  address?: string;
  gstNumber?: string;
  creditBalance: number; // Positive = Customer owes shop. Negative = Shop owes supplier.
  notes?: string;
  isSample?: boolean;
  createdAt: string;
}

export type PaymentType = 'customer_payment' | 'supplier_payment';

export interface Payment {
  id: string;
  date: string;
  contactId: string;
  contactName: string;
  type: PaymentType;
  amount: number;
  paymentMethod: PaymentMethod;
  saleId?: string;
  notes?: string;
  isSample?: boolean;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'rent' | 'electricity' | 'tea_snacks' | 'staff' | 'transport' | 'maintenance' | 'other';
  amount: number;
  notes?: string;
  isSample?: boolean;
  createdAt: string;
}

export interface WallDimension {
  id: string;
  name: string;
  lengthFeet: number;
  heightFeet: number;
  deductionsSqFt: number; // e.g. door/window area
  netSqFt: number;
}

export interface MaterialRequirement {
  id: string;
  materialType: 'putty' | 'primer' | 'paint' | 'pop' | 'custom';
  materialName: string;
  coats: number;
  coverageSqFtPerUnit: number; // Coverage for 1 unit for 1 coat or specified coats
  extraAllowancePercent: number; // e.g. 10%
  totalRequiredQty: number;
  unit: string; // 'litres', 'kg', 'bags', etc.
  packSizes: { size: number; label: string }[];
  packRecommendation: string;
  estimatedRatePerUnit: number;
  estimatedCost: number;
}

export interface MaterialEstimate {
  id: string;
  title: string;
  date: string;
  clientName?: string;
  clientPhone?: string;
  walls: WallDimension[];
  totalAreaSqFt: number;
  materials: MaterialRequirement[];
  totalEstimatedCost: number;
  notes?: string;
  isSample?: boolean;
  createdAt: string;
}

export interface Professional {
  id: string;
  name: string;
  profession: string; // Painter, Plumber, Electrician, Carpenter, Mason / Mistri, POP Expert, Welder, Contractor, Other
  phone: string;
  alternatePhone?: string;
  address: string;
  cityArea: string;
  rating: number; // 1 to 5
  priceRange: string; // e.g. "₹500 - ₹700 / day" or "₹15 / sq.ft"
  photoUrl?: string;
  skills: string[];
  experienceYears?: number;
  bio?: string;
  isAvailable: boolean;
  isSample?: boolean;
  createdAt: string;
}
