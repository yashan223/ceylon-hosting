import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getProductById, updateProduct } from "@/server/catalog/products";
import { uploadProductFile } from "@/server/storage/private-files";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/"))
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  if (file.size === 0 || file.size > 10 * 1024 * 1024)
    return NextResponse.json({ error: "Image must be between 1 byte and 10 MB." }, { status: 400 });

  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  try {
    const uploaded = await uploadProductFile(id, file);
    const imageUrl = `/api/products/${encodeURIComponent(id)}/image`;
    await updateProduct(id, {
      imageUrl,
      imageKey: uploaded.key,
      imageContentType: uploaded.contentType,
    });
    console.info("Product image uploaded", {
      productId: id,
      fileName: uploaded.fileName,
      adminId: admin.id,
    });
    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Product image upload failed", error);
    return NextResponse.json({ error: "Unable to store the product image." }, { status: 502 });
  }
}
