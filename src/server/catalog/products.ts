import type { Product } from "@/types/product";
import { getSupabaseAdmin } from "@/server/db/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSupabaseProduct(row: any): Product {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    location: row.location || undefined,
    locations: Array.isArray(row.locations) ? row.locations : undefined,
    meta: row.meta || undefined,
    tag: row.tag || undefined,
    accent: row.accent || "slate",
    imageUrl: row.image_url || undefined,
    imageKey: row.image_key || undefined,
    imageContentType: row.image_content_type || undefined,
    images: Array.isArray(row.images) ? row.images : undefined,
    galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : undefined,
    active: row.active !== false,
    available: row.available !== false,
    downloadKey: row.download_key || undefined,
    downloadName: row.download_name || undefined,
    downloadSize: row.download_size ? Number(row.download_size) : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export async function getActiveProducts(): Promise<Product[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("type", { ascending: true })
      .order("created_at", { ascending: false });

    if (data && !error) {
      return data.map(mapSupabaseProduct);
    }
  } catch (err) {
    console.warn("Supabase getActiveProducts error:", err);
  }
  return [];
}

export async function getActiveProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("id", ids)
      .eq("active", true);

    if (data && !error) {
      return data.map(mapSupabaseProduct);
    }
  } catch (err) {
    console.warn("Supabase getActiveProductsByIds error:", err);
  }
  return [];
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .in("id", ids);

    if (data && !error) {
      return data.map(mapSupabaseProduct);
    }
  } catch (err) {
    console.warn("Supabase getProductsByIds error:", err);
  }
  return [];
}

export async function getActiveProductById(id: string): Promise<Product | null> {
  const products = await getActiveProductsByIds([id]);
  return products[0] ?? null;
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (data && !error) {
      return mapSupabaseProduct(data);
    }
  } catch (err) {
    console.warn("Supabase getProductById error:", err);
  }
  return null;
}

export async function insertProduct(product: Product): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("products").insert({
    id: product.id,
    type: product.type,
    name: product.name,
    description: product.description,
    price: product.price,
    location: product.location ?? null,
    locations: product.locations ?? [],
    meta: product.meta ?? null,
    tag: product.tag ?? null,
    accent: product.accent ?? "slate",
    image_url: product.imageUrl ?? null,
    image_key: product.imageKey ?? null,
    image_content_type: product.imageContentType ?? null,
    images: product.images ?? [],
    gallery_images: product.galleryImages ?? [],
    active: product.active !== false,
    available: product.available !== false,
    download_key: product.downloadKey ?? null,
    download_name: product.downloadName ?? null,
    download_size: product.downloadSize ?? null,
    created_at: product.createdAt ?? new Date().toISOString(),
    updated_at: product.updatedAt ?? new Date().toISOString(),
  });
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    updated_at: new Date().toISOString(),
  };
  if (updates.type !== undefined) payload.type = updates.type;
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.price !== undefined) payload.price = updates.price;
  if (updates.location !== undefined) payload.location = updates.location;
  if (updates.locations !== undefined) payload.locations = updates.locations;
  if (updates.meta !== undefined) payload.meta = updates.meta;
  if (updates.tag !== undefined) payload.tag = updates.tag;
  if (updates.accent !== undefined) payload.accent = updates.accent;
  if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
  if (updates.imageKey !== undefined) payload.image_key = updates.imageKey;
  if (updates.imageContentType !== undefined) payload.image_content_type = updates.imageContentType;
  if (updates.images !== undefined) payload.images = updates.images;
  if (updates.galleryImages !== undefined) payload.gallery_images = updates.galleryImages;
  if (updates.active !== undefined) payload.active = updates.active;
  if (updates.available !== undefined) payload.available = updates.available;
  if (updates.downloadKey !== undefined) payload.download_key = updates.downloadKey;
  if (updates.downloadName !== undefined) payload.download_name = updates.downloadName;
  if (updates.downloadSize !== undefined) payload.download_size = updates.downloadSize;

  const { data, error } = await supabase.from("products").update(payload).eq("id", id).select("id");
  if (!error && data && data.length > 0) {
    return true;
  }
  if (error) {
    console.warn("Supabase updateProduct error:", error);
  }
  return false;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("products").delete().eq("id", id).select("id");
  if (!error && data && data.length > 0) {
    return true;
  }
  if (error) {
    console.warn("Supabase deleteProduct error:", error);
  }
  return false;
}
