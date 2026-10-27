import { ProductImage } from './shop.models';

export interface Product {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  description: string | null;
  price: number;
  mainImage: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  images: ProductImage[];
  createdAt: string;
  updatedAt: string;

  // New Phase 1 Fulfillment fields
  scheduledEligible: boolean;
  earliestScheduledDate: string; // ISO date format "YYYY-MM-DD"
  instantAvailableToday: boolean;
  instantQuantityToday: number;
  instantAvailableUntil: string | null; // ISO-8601 string or null
}
