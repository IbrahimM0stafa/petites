export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  sortOrder: number;
}

export interface ProductImage {
  id: string;
  imageUrl: string;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  description: string;
  price: number;
  mainImage?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  images: ProductImage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
