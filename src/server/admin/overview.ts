import { getSupabaseAdmin } from "@/server/db/supabase";
import type { Product } from "@/types/product";

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

export async function getAdminOverview() {
  try {
    const supabase = getSupabaseAdmin();
    const [
      { count: totalProducts },
      { count: activeProducts },
      { count: serverProducts },
      { count: modProducts },
      { count: serviceProducts },
      { count: totalOrders },
      { count: totalUsers },
      { count: activeSubscriptions },
      { data: downloadableProducts },
    ] = await Promise.all([
      supabase.from("products").select("*", { count: "exact", head: true }),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("active", true),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("type", "server").eq("active", true),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("type", "mod").eq("active", true),
      supabase.from("products").select("*", { count: "exact", head: true }).eq("type", "service").eq("active", true),
      supabase.from("orders").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("server_subscriptions").select("*", { count: "exact", head: true }).neq("status", "cancelled"),
      supabase.from("products").select("download_size").not("download_key", "is", null).neq("download_key", ""),
    ]);

    const totalFiles = (downloadableProducts || []).length;
    const totalStorageBytes = (downloadableProducts || []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, p: any) => sum + (Number(p.download_size) || 0),
      0,
    );

    return {
      totalProducts: totalProducts ?? 0,
      activeProducts: activeProducts ?? 0,
      serverProducts: serverProducts ?? 0,
      modProducts: modProducts ?? 0,
      serviceProducts: serviceProducts ?? 0,
      totalOrders: totalOrders ?? 0,
      totalUsers: totalUsers ?? 0,
      activeSubscriptions: activeSubscriptions ?? 0,
      totalFiles,
      totalStorageBytes,
    };
  } catch (err) {
    console.warn("Supabase getAdminOverview error:", err);
    return {
      totalProducts: 0,
      activeProducts: 0,
      serverProducts: 0,
      modProducts: 0,
      serviceProducts: 0,
      totalOrders: 0,
      totalUsers: 0,
      activeSubscriptions: 0,
      totalFiles: 0,
      totalStorageBytes: 0,
    };
  }
}

export async function getAdminProducts(): Promise<Product[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("updated_at", { ascending: false });

    if (data && !error) {
      return data.map(mapSupabaseProduct);
    }
  } catch (err) {
    console.warn("Supabase getAdminProducts error:", err);
  }

  return [];
}
