export interface ProductImageResponse {
  id: string;
  imageUrl: string;
}

export interface Product {
  id: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  description?: string;
  price: number;
  mainImage?: string;
  isAvailable: boolean;
  isFeatured: boolean;
  images: ProductImageResponse[];
  createdAt: string;
  updatedAt: string;
}

/* ---------- DTOs used when sending data to the backend ---------- */
export interface ProductCreateRequest {
  categoryId?: string;
  name: string;
  description?: string;
  price: number;
  mainImage?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  imageUrls?: string[];
}

export interface ProductUpdateRequest {
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  mainImage?: string;
  isAvailable?: boolean;
  isFeatured?: boolean;
  imageUrls?: string[];
}
