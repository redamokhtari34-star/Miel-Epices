export interface Product {
  id: string;
  name: string;
  category: 'amande' | 'noix' | 'assortiment';
  price: number; // base price for 250g
  description: string;
  longDescription: string;
  ingredients: string[];
  conservation: string;
  stock: number;
  image: string;
  rating: number;
  reviewsCount: number;
  badge?: string;
}

export interface WeightOption {
  label: string;
  multiplier: number;
  weight: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  weightOption: WeightOption;
}

export interface Order {
  id: string;
  customerName: string;
  email: string;
  address: string;
  phone: string;
  items: { name: string; quantity: number; weight: string }[];
  total: number;
  status: 'awaiting_payment' | 'pending' | 'preparing' | 'shipped' | 'cancelled';
  date: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  date: string;
}
