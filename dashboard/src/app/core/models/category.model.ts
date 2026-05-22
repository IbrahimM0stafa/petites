export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface CategoryCreateRequest {
  name: string;
  imageUrl?: string;
  sortOrder?: number;
}

export interface CategoryUpdateRequest {
  name?: string;
  imageUrl?: string;
  sortOrder?: number;
}
