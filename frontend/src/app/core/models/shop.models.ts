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

import { Product } from './product.model';
export type { Product };

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
