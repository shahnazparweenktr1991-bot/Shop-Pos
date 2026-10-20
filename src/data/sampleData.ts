import { Category, Product, Sale, Purchase, Contact, Payment, Expense, MaterialEstimate, Professional } from '../types';

export const SAMPLE_CATEGORIES: Category[] = [
  { 
    id: 'cat-paint', 
    name: 'Paint', 
    description: 'Interior, exterior, enamel & distemper', 
    imageUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=300&auto=format&fit=crop&q=60',
    subcategories: [
      { id: 'sub-int-paint', name: 'Interior Emulsion' },
      { id: 'sub-ext-paint', name: 'Exterior Emulsion' },
      { id: 'sub-enamel', name: 'Enamel & Gloss' },
      { id: 'sub-distemper', name: 'Distemper' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
  { 
    id: 'cat-primer', 
    name: 'Primer', 
    description: 'Wall & wood primers', 
    imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&auto=format&fit=crop&q=60',
    subcategories: [
      { id: 'sub-wall-primer', name: 'Wall Primer' },
      { id: 'sub-metal-primer', name: 'Red Oxide / Metal' },
      { id: 'sub-wood-primer', name: 'Wood Primer' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
  { 
    id: 'cat-putty', 
    name: 'Putty', 
    description: 'Wall care putty & acrylic putty', 
    imageUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=300&auto=format&fit=crop&q=60',
    subcategories: [
      { id: 'sub-white-putty', name: 'White Cement Putty' },
      { id: 'sub-acrylic-putty', name: 'Acrylic Wall Putty' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
  { 
    id: 'cat-pop', 
    name: 'POP', 
    description: 'Plaster of Paris for false ceiling & repair', 
    subcategories: [
      { id: 'sub-sakarni-pop', name: 'Standard Grade POP' },
      { id: 'sub-casting-pop', name: 'Ceiling & Moulding' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
  { 
    id: 'cat-adhesive', 
    name: 'Adhesive', 
    description: 'Wood glue, sealants & chemical anchors', 
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=300&auto=format&fit=crop&q=60',
    subcategories: [
      { id: 'sub-wood-glue', name: 'Fevicol / Wood Glue' },
      { id: 'sub-silicone', name: 'Silicone & Sealant' },
      { id: 'sub-instant', name: 'Instant Glue / Araldite' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
  { 
    id: 'cat-plumbing', 
    name: 'Plumbing', 
    description: 'PVC, CPVC pipes & sanitary fittings', 
    imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=300&auto=format&fit=crop&q=60',
    subcategories: [
      { id: 'sub-pvc-pipes', name: 'Pipes & Conduits' },
      { id: 'sub-fittings', name: 'Elbows, Tees & Couplers' },
      { id: 'sub-valves', name: 'Taps & Valves' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
  { 
    id: 'cat-electrical', 
    name: 'Electrical', 
    description: 'Switches, wires & conduits', 
    subcategories: [
      { id: 'sub-wires', name: 'Cables & Wires' },
      { id: 'sub-switches', name: 'Modular Switches' },
      { id: 'sub-tape', name: 'Insulation & PVC Tape' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
  { 
    id: 'cat-hardware', 
    name: 'Hardware', 
    description: 'Fasteners, screws, hinges & tools', 
    subcategories: [
      { id: 'sub-fasteners', name: 'Screws & Fasteners' },
      { id: 'sub-hinges', name: 'Hinges & Handles' },
      { id: 'sub-tools', name: 'Tools & Blades' }
    ],
    isSample: true,
    recordOrigin: 'sample', 
    createdAt: '2026-10-01T08:00:00Z' 
  },
];

export const SAMPLE_CONTACTS: Contact[] = [
  {
    id: 'cnt-1',
    name: 'Ramesh Painter',
    phone: '+91 98765 43210',
    profession: 'painter',
    location: 'Gandhi Nagar, Market Road',
    creditBalance: 1450, // owes us ₹1450
    notes: 'Works on commercial & residential projects. Takes material on weekly credit.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-02T10:00:00Z'
  },
  {
    id: 'cnt-2',
    name: 'Sharma Construction (Rajesh)',
    phone: '+91 98220 11223',
    profession: 'contractor',
    location: 'Sector 4, Phase 2',
    creditBalance: 8200, // owes us ₹8200
    notes: 'Large site orders, settles by bank transfer every 15 days.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-03T11:00:00Z'
  },
  {
    id: 'cnt-3',
    name: 'Vikram Plumber',
    phone: '+91 97110 55443',
    profession: 'plumber',
    location: 'Station Road',
    creditBalance: 0,
    notes: 'Cash on delivery buyer, regular PVC & valve purchases.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-04T09:00:00Z'
  },
  {
    id: 'cnt-4',
    name: 'Sunil Electrician',
    phone: '+91 99341 88776',
    profession: 'electrician',
    location: 'Shastri Chowk',
    creditBalance: 600,
    notes: 'Buys modular boxes and 2.5sqmm cables.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-05T14:00:00Z'
  },
  {
    id: 'cnt-5',
    name: 'Asian Paints Depot Wholesaler',
    phone: '+91 98112 34567',
    profession: 'supplier',
    location: 'Industrial Area Depot No. 4',
    creditBalance: -24500, // We owe them ₹24,500
    notes: 'Main paint & primer distributor. Payment due on 20th.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cnt-6',
    name: 'National Hardware Agencies',
    phone: '+91 98334 77889',
    profession: 'supplier',
    location: 'Loha Mandi, Gate 2',
    creditBalance: -8500, // We owe them ₹8,500
    notes: 'Fastener, pipe & adhesive supplier.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'cnt-7',
    name: 'Anil Gupta (Homeowner)',
    phone: '+91 94150 99881',
    profession: 'customer',
    location: 'House 42, Civil Lines',
    creditBalance: 0,
    notes: 'Renovating his independent bungalow.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-08T12:00:00Z'
  }
];

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    code: 'PNT-TRAC-20L',
    name: 'Tractor Acrylic Emulsion White',
    brand: 'Asian Paints',
    categoryId: 'cat-paint',
    subcategoryId: 'sub-int-paint',
    subcategoryName: 'Interior Emulsion',
    imageUrl: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=300&auto=format&fit=crop&q=60',
    purchasePrice: 2850,
    sellingPrice: 3300,
    currentStock: 4,
    minStock: 5, // LOW STOCK ALERT
    unit: 'tins',
    packageSize: '20 Litres Bucket',
    supplierId: 'cnt-5',
    supplierName: 'Asian Paints Depot Wholesaler',
    notes: 'Bestseller interior economy paint. Fast turnaround.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-2',
    code: 'PNT-TRAC-4L',
    name: 'Tractor Acrylic Emulsion White',
    brand: 'Asian Paints',
    categoryId: 'cat-paint',
    subcategoryId: 'sub-int-paint',
    subcategoryName: 'Interior Emulsion',
    imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=300&auto=format&fit=crop&q=60',
    purchasePrice: 620,
    sellingPrice: 740,
    currentStock: 12,
    minStock: 6,
    unit: 'tins',
    packageSize: '4 Litres Can',
    supplierId: 'cnt-5',
    supplierName: 'Asian Paints Depot Wholesaler',
    notes: 'Interior paint touchups & small rooms.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-3',
    code: 'PNT-APEX-20L',
    name: 'Apex Weatherproof Exterior Emulsion',
    brand: 'Asian Paints',
    categoryId: 'cat-paint',
    purchasePrice: 5100,
    sellingPrice: 5900,
    currentStock: 3,
    minStock: 4, // LOW STOCK ALERT
    unit: 'tins',
    packageSize: '20 Litres Bucket',
    supplierId: 'cnt-5',
    supplierName: 'Asian Paints Depot Wholesaler',
    notes: 'Exterior anti-fungal paint with 5-year warranty.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-4',
    code: 'PRM-DECO-20L',
    name: 'TruCare Interior Wall Primer (Water Based)',
    brand: 'Asian Paints',
    categoryId: 'cat-primer',
    purchasePrice: 1850,
    sellingPrice: 2200,
    currentStock: 8,
    minStock: 4,
    unit: 'tins',
    packageSize: '20 Litres Bucket',
    supplierId: 'cnt-5',
    supplierName: 'Asian Paints Depot Wholesaler',
    notes: 'Dilution 80-100% with water. Essential basecoat.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-5',
    code: 'PUT-BIRLA-40KG',
    name: 'White Wall Care Putty',
    brand: 'Birla White',
    categoryId: 'cat-putty',
    purchasePrice: 820,
    sellingPrice: 960,
    currentStock: 18,
    minStock: 10,
    unit: 'bags',
    packageSize: '40 kg Bag',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'High water resistance. 2-coat application.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-6',
    code: 'PUT-JK-20KG',
    name: 'JK Cement WallMaxX Putty',
    brand: 'JK Cement',
    categoryId: 'cat-putty',
    purchasePrice: 440,
    sellingPrice: 530,
    currentStock: 2,
    minStock: 5, // LOW STOCK ALERT
    unit: 'bags',
    packageSize: '20 kg Bag',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'Smooth finish white cement based.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-7',
    code: 'POP-SAK-25KG',
    name: 'Sakarni Plaster of Paris Super Fine',
    brand: 'Sakarni',
    categoryId: 'cat-pop',
    purchasePrice: 280,
    sellingPrice: 360,
    currentStock: 24,
    minStock: 8,
    unit: 'bags',
    packageSize: '25 kg Bag',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'For false ceilings and moulding work.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-8',
    code: 'ADH-FEV-1KG',
    name: 'Fevicol SH Synthetic Resin Adhesive',
    brand: 'Pidilite',
    categoryId: 'cat-adhesive',
    purchasePrice: 240,
    sellingPrice: 290,
    currentStock: 15,
    minStock: 6,
    unit: 'kilograms',
    packageSize: '1 kg Bottle',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'Wood glue standard. High demand carpenter item.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-9',
    code: 'ADH-FIX-LW1L',
    name: 'Dr. Fixit 101 LW+ Waterproofing Compound',
    brand: 'Pidilite',
    categoryId: 'cat-adhesive',
    purchasePrice: 135,
    sellingPrice: 175,
    currentStock: 28,
    minStock: 10,
    unit: 'litres',
    packageSize: '1 Litre Bottle',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'Concrete and plaster waterproofing additive.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-10',
    code: 'PLM-FIN-PVC1IN',
    name: 'PVC 1-inch Schedule 40 Pipe (10ft length)',
    brand: 'Finolex',
    categoryId: 'cat-plumbing',
    purchasePrice: 195,
    sellingPrice: 250,
    currentStock: 35,
    minStock: 15,
    unit: 'pieces',
    packageSize: '10 ft Length',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'Plumbing drain & line pipe.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-11',
    code: 'ELC-ANC-SW10A',
    name: 'Roma 10A 1-Way Modular Switch White',
    brand: 'Anchor',
    categoryId: 'cat-electrical',
    purchasePrice: 22,
    sellingPrice: 35,
    currentStock: 90,
    minStock: 30,
    unit: 'pieces',
    packageSize: 'Box of 20 pcs',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'Modular plate switch.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'prod-12',
    code: 'HRD-SCW-1.5IN',
    name: 'Drywall Screws 1.5-inch Black Star (Pack of 100)',
    brand: 'Unbranded',
    categoryId: 'cat-hardware',
    purchasePrice: 65,
    sellingPrice: 95,
    currentStock: 1,
    minStock: 5, // LOW STOCK ALERT
    unit: 'boxes',
    packageSize: 'Box of 100 pcs',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    notes: 'Gypsum board & false ceiling fixing screws.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z'
  }
];

export const SAMPLE_SALES: Sale[] = [
  {
    id: 'sale-101',
    billNumber: 'INV-1001',
    date: '2026-10-13T09:30:00Z', // Today's sale
    type: 'itemised',
    status: 'finalised',
    customerId: 'cnt-1',
    customerName: 'Ramesh Painter',
    customerPhone: '+91 98765 43210',
    items: [
      {
        id: 'si-1',
        saleId: 'sale-101',
        productId: 'prod-1',
        productName: 'Tractor Acrylic Emulsion White',
        productCode: 'PNT-TRAC-20L',
        brand: 'Asian Paints',
        unit: 'tins',
        packageSize: '20 Litres Bucket',
        quantity: 1,
        purchasePrice: 2850,
        sellingPrice: 3250, // Discounted for contractor
        totalPrice: 3250
      },
      {
        id: 'si-2',
        saleId: 'sale-101',
        productId: 'prod-5',
        productName: 'White Wall Care Putty',
        productCode: 'PUT-BIRLA-40KG',
        brand: 'Birla White',
        unit: 'bags',
        packageSize: '40 kg Bag',
        quantity: 2,
        purchasePrice: 820,
        sellingPrice: 950,
        totalPrice: 1900
      }
    ],
    subtotal: 5150,
    discount: 50,
    totalAmount: 5100,
    amountReceived: 3650,
    remainingBalance: 1450, // Added to Ramesh's credit
    paymentMethod: 'upi',
    notes: 'Site at Model Town. Remaining ₹1,450 to be paid on Saturday.',
    stockDeducted: true,
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-13T09:30:00Z'
  },
  {
    id: 'sale-102',
    billNumber: 'QS-1002',
    date: '2026-10-13T10:15:00Z', // Today's quick sale
    type: 'amount_only',
    status: 'finalised',
    customerName: 'Walk-in Cash Customer',
    items: [],
    subtotal: 350,
    discount: 0,
    totalAmount: 350,
    amountReceived: 350,
    remainingBalance: 0,
    paymentMethod: 'cash',
    notes: 'Small hardware, sandpaper and masking tape bundle.',
    stockDeducted: false, // Amount only does NOT touch stock
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-13T10:15:00Z'
  },
  {
    id: 'sale-103',
    billNumber: 'INV-1003',
    date: '2026-10-12T16:45:00Z', // Yesterday's sale
    type: 'itemised',
    status: 'finalised',
    customerId: 'cnt-7',
    customerName: 'Anil Gupta (Homeowner)',
    customerPhone: '+91 94150 99881',
    items: [
      {
        id: 'si-3',
        saleId: 'sale-103',
        productId: 'prod-4',
        productName: 'TruCare Interior Wall Primer (Water Based)',
        productCode: 'PRM-DECO-20L',
        brand: 'Asian Paints',
        unit: 'tins',
        packageSize: '20 Litres Bucket',
        quantity: 1,
        purchasePrice: 1850,
        sellingPrice: 2200,
        totalPrice: 2200
      },
      {
        id: 'si-4',
        saleId: 'sale-103',
        productId: 'prod-8',
        productName: 'Fevicol SH Synthetic Resin Adhesive',
        productCode: 'ADH-FEV-1KG',
        brand: 'Pidilite',
        unit: 'kilograms',
        packageSize: '1 kg Bottle',
        quantity: 2,
        purchasePrice: 240,
        sellingPrice: 290,
        totalPrice: 580
      }
    ],
    subtotal: 2780,
    discount: 80,
    totalAmount: 2700,
    amountReceived: 2700,
    remainingBalance: 0,
    paymentMethod: 'cash',
    notes: 'Full payment received in cash.',
    stockDeducted: true,
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-12T16:45:00Z'
  }
];

export const SAMPLE_PURCHASES: Purchase[] = [
  {
    id: 'pur-101',
    purchaseNumber: 'PUR-501',
    date: '2026-10-10T11:00:00Z',
    supplierId: 'cnt-5',
    supplierName: 'Asian Paints Depot Wholesaler',
    productId: 'prod-1',
    productName: 'Tractor Acrylic Emulsion White (20L)',
    quantity: 10,
    purchasePrice: 2850,
    totalAmount: 28500,
    amountPaid: 15000,
    remainingBalance: 13500,
    notes: 'Festival restocking batch.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-10T11:00:00Z'
  },
  {
    id: 'pur-102',
    purchaseNumber: 'PUR-502',
    date: '2026-10-11T14:30:00Z',
    supplierId: 'cnt-6',
    supplierName: 'National Hardware Agencies',
    productId: 'prod-5',
    productName: 'White Wall Care Putty (40kg)',
    quantity: 20,
    purchasePrice: 820,
    totalAmount: 16400,
    amountPaid: 16400,
    remainingBalance: 0,
    notes: 'Direct truck delivery paid via NEFT.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-11T14:30:00Z'
  }
];

export const SAMPLE_PAYMENTS: Payment[] = [
  {
    id: 'pay-1',
    date: '2026-10-12T17:00:00Z',
    contactId: 'cnt-2',
    contactName: 'Sharma Construction (Rajesh)',
    type: 'customer_payment',
    amount: 5000,
    paymentMethod: 'upi',
    notes: 'Part payment received for Sector 4 project.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-12T17:00:00Z'
  },
  {
    id: 'pay-2',
    date: '2026-10-11T15:00:00Z',
    contactId: 'cnt-5',
    contactName: 'Asian Paints Depot Wholesaler',
    type: 'supplier_payment',
    amount: 15000,
    paymentMethod: 'bank_transfer',
    notes: 'Advance cheque cleared.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-11T15:00:00Z'
  }
];

export const SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: '2026-10-13T08:30:00Z',
    category: 'tea_snacks',
    amount: 80,
    notes: 'Morning tea and biscuits for shop staff and visiting painters.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-13T08:30:00Z'
  },
  {
    id: 'exp-2',
    date: '2026-10-10T12:00:00Z',
    category: 'transport',
    amount: 350,
    notes: 'Auto tempo freight charges for transporting 20 putty bags from godown.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-10T12:00:00Z'
  },
  {
    id: 'exp-3',
    date: '2026-10-05T10:00:00Z',
    category: 'electricity',
    amount: 1200,
    notes: 'September month shop electricity bill.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-05T10:00:00Z'
  }
];

export const SAMPLE_ESTIMATES: MaterialEstimate[] = [
  {
    id: 'est-1',
    title: '3BHK Flat Complete Painting (Living Room + 2 Bedrooms)',
    date: '2026-10-12T15:00:00Z',
    clientName: 'Suresh Kumar Verma',
    clientPhone: '+91 98450 12345',
    walls: [
      { id: 'w-1', name: 'Living Room Walls (4 Sides)', lengthFeet: 64, heightFeet: 10, deductionsSqFt: 60, netSqFt: 580 },
      { id: 'w-2', name: 'Living Room Ceiling', lengthFeet: 18, heightFeet: 14, deductionsSqFt: 0, netSqFt: 252 },
      { id: 'w-3', name: 'Master Bedroom Walls', lengthFeet: 52, heightFeet: 10, deductionsSqFt: 45, netSqFt: 475 },
      { id: 'w-4', name: 'Guest Bedroom Walls', lengthFeet: 44, heightFeet: 10, deductionsSqFt: 35, netSqFt: 405 }
    ],
    totalAreaSqFt: 1712,
    materials: [
      {
        id: 'mat-1',
        materialType: 'putty',
        materialName: 'Birla White Wall Care Putty (2 Coats)',
        coats: 2,
        coverageSqFtPerUnit: 16, // 16 sq.ft per kg for 2 coats
        extraAllowancePercent: 10,
        totalRequiredQty: 118, // ~118 kg
        unit: 'kg',
        packSizes: [{ size: 40, label: '40 kg bag' }, { size: 20, label: '20 kg bag' }, { size: 5, label: '5 kg' }],
        packRecommendation: '2 x 40kg + 2 x 20kg (Total 120 kg)',
        estimatedRatePerUnit: 24,
        estimatedCost: 2880
      },
      {
        id: 'mat-2',
        materialType: 'primer',
        materialName: 'Asian Paints TruCare Interior Primer (1 Coat)',
        coats: 1,
        coverageSqFtPerUnit: 120, // 120 sq.ft per Litre for 1 coat
        extraAllowancePercent: 10,
        totalRequiredQty: 16, // ~15.7 L
        unit: 'litres',
        packSizes: [{ size: 20, label: '20L Bucket' }, { size: 10, label: '10L' }, { size: 4, label: '4L' }, { size: 1, label: '1L' }],
        packRecommendation: '1 x 20L Bucket (or 1 x 10L + 1 x 4L + 2 x 1L)',
        estimatedRatePerUnit: 110,
        estimatedCost: 2200
      },
      {
        id: 'mat-3',
        materialType: 'paint',
        materialName: 'Asian Paints Tractor Emulsion (2 Coats)',
        coats: 2,
        coverageSqFtPerUnit: 65, // ~65 sq.ft per Litre for 2 coats
        extraAllowancePercent: 10,
        totalRequiredQty: 29, // ~29 Litres
        unit: 'litres',
        packSizes: [{ size: 20, label: '20L Bucket' }, { size: 10, label: '10L' }, { size: 4, label: '4L' }, { size: 1, label: '1L' }],
        packRecommendation: '1 x 20L Bucket + 2 x 4L Cans + 1 x 1L Can (Total 29L)',
        estimatedRatePerUnit: 165,
        estimatedCost: 4785
      }
    ],
    totalEstimatedCost: 9865,
    notes: 'Quotation provided to painter Ramesh for Mr. Suresh Verma flat handover before Diwali.',
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-12T15:00:00Z'
  }
];

export const SAMPLE_PROFESSIONALS: Professional[] = [
  {
    id: 'prof-1',
    name: 'Ramesh Kumar (Master Painter)',
    profession: 'Painter',
    phone: '9876543210',
    alternatePhone: '9876543211',
    address: 'Near Old Bus Stand, Jhulaniya Road',
    cityArea: 'Jhulaniya Chowk',
    rating: 5,
    priceRange: '₹600 - ₹750 / day (₹12 - ₹16 / sq.ft)',
    experienceYears: 12,
    photoUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=240&auto=format&fit=crop&q=80',
    skills: ['Interior Royal Texture', 'Apex Weatherproof Exterior', 'Wall Putty Finishing', 'Waterproofing'],
    bio: 'Lead contractor for interior & exterior painting. Team of 5 skilled workers. Known for clean work and fast handover.',
    isAvailable: true,
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-01T08:00:00Z'
  },
  {
    id: 'prof-2',
    name: 'Aslam Mistri (Plumber & Sanitary)',
    profession: 'Plumber',
    phone: '9823456789',
    address: 'Dehariya Masjid Lane, Shop #4',
    cityArea: 'Dehariya',
    rating: 4.8,
    priceRange: '₹500 - ₹700 / day (₹350 / bathroom visit)',
    experienceYears: 9,
    photoUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=240&auto=format&fit=crop&q=80',
    skills: ['CPVC & UPVC Concealed Piping', 'Jaguar & Cera Fitting', 'Overhead Water Tank Install', 'Leakage Repair'],
    bio: 'Expert in new house concealed plumbing and bathroom remodelling. Reliable 24/7 emergency leakage support.',
    isAvailable: true,
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-02T08:00:00Z'
  },
  {
    id: 'prof-3',
    name: 'Vikram Sharma (Licensed Electrician)',
    profession: 'Electrician',
    phone: '9890123456',
    address: 'Station Road, Opp. Electricity Board',
    cityArea: 'Civil Lines',
    rating: 4.9,
    priceRange: '₹650 - ₹800 / day (₹150 / point)',
    experienceYears: 10,
    photoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=240&auto=format&fit=crop&q=80',
    skills: ['Concealed House Wiring', 'MCB & Inverter Setup', 'Submersible Motor Wiring', 'Modular Switch Boards'],
    bio: 'Government licensed wireman. Complete wiring for new construction and renovation. Quick troubleshooting.',
    isAvailable: true,
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-03T08:00:00Z'
  },
  {
    id: 'prof-4',
    name: 'Santosh Carpenter (Wood & Furniture)',
    profession: 'Carpenter',
    phone: '9765432109',
    address: 'Timber Market, Gali No. 3',
    cityArea: 'Timber Market',
    rating: 4.7,
    priceRange: '₹700 - ₹900 / day',
    experienceYears: 14,
    photoUrl: 'https://images.unsplash.com/photo-1533090161767-e6ffed986b88?w=240&auto=format&fit=crop&q=80',
    skills: ['Modular Kitchen Cabinets', 'Flush Door & Window Fitting', 'Wardrobe & Sunmica Paste', 'Lock Installation'],
    bio: 'Specialist in custom modular kitchens, wardrobes, and high-end hardware fittings like telescopic channels & hinges.',
    isAvailable: true,
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-04T08:00:00Z'
  },
  {
    id: 'prof-5',
    name: 'Mohammad Imran (POP & False Ceiling)',
    profession: 'POP Artisan',
    phone: '9123456780',
    address: 'Near Water Tank, Jhulaniya Chowk',
    cityArea: 'Jhulaniya',
    rating: 4.9,
    priceRange: '₹600 - ₹750 / day (₹65 - ₹85 / sq.ft false ceiling)',
    experienceYears: 8,
    photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=240&auto=format&fit=crop&q=80',
    skills: ['Gypsum False Ceiling', 'Designer POP Moulding', 'Cove Lighting Channels', 'Crack Repair & Putty'],
    bio: 'Designer POP and false ceiling specialist. Creates modern living room & bedroom ceiling designs with clean laser leveling.',
    isAvailable: false,
    isSample: true,
    recordOrigin: 'sample',
    createdAt: '2026-10-05T08:00:00Z'
  }
];

