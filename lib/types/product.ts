
export interface PriceTier {
  minQty: number;
  price: number;
}

export interface PrintOption {
  code: string;
  quantity: number;
  price: number;
}

export interface Product {
  _id: string;

  name: string;
  category: string;
  subcategory: string | null;
  currency: string;

  price: PriceTier[];
  description: string;
  tags: string[];

  type?: string;
  weight?: string;
  color: string;
  appMethod?: string;
  material?: string;

  bottom?: boolean;
  handle?: boolean;
  handleColor?: string;

  density?: string;
  size: string;

  docsPocket?: boolean;
  stickyAss?: boolean;
  window?: boolean;
  zipLock?: boolean;

  images?: string[];
  printOptions: PrintOption[];

  createdAt?: string;
  updatedAt?: string;
}

export type ProductFormData = Omit<
  Product,
  "_id" | "createdAt" | "updatedAt" | "images"
> & {
  images: string[];
};

export interface ProductCategory {
  category: string;
  subcategories: string[];
}
