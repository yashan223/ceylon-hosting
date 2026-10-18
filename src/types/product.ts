export const productTypes = ["server", "mod", "service"] as const;

export type ProductType = (typeof productTypes)[number];

export type ProductGalleryItem = {
  id: string;
  url: string;
  key?: string;
  contentType?: string;
  fileName?: string;
};

export type Product = {
  id: string;
  type: ProductType;
  name: string;
  description: string;
  price: number;
  meta?: string;
  tag?: string;
  accent: string;
  imageUrl?: string;
  imageKey?: string;
  imageContentType?: string;
  images?: string[];
  galleryImages?: ProductGalleryItem[];
  active: boolean;
  available?: boolean;
  downloadKey?: string;
  downloadName?: string;
  createdAt?: string;
  updatedAt?: string;
};
