import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/admin";
import { getProductById, updateProduct } from "@/server/catalog/products";
import {
  uploadProductFile,
  readProductFile,
  deleteProductFile,
} from "@/server/storage/private-files";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product?.downloadKey || !product.downloadName)
    return NextResponse.json({ error: "No file found for this product." }, { status: 404 });

  try {
    const file = await readProductFile(product.downloadKey);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${product.downloadName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk." }, { status: 404 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const admin = await requireAdmin();
  const { id } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Attach a file." }, { status: 400 });
  if (file.size === 0 || file.size > 500 * 1024 * 1024)
    return NextResponse.json({ error: "File must be between 1 byte and 500 MB." }, { status: 400 });

  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  if (product.downloadKey) {
    await deleteProductFile(product.downloadKey);
  }

  try {
    const uploaded = await uploadProductFile(id, file);
    await updateProduct(id, {
      downloadKey: uploaded.key,
      downloadName: uploaded.fileName,
      downloadSize: uploaded.size,
    });
    console.info("Private product file uploaded", {
      productId: id,
      fileName: uploaded.fileName,
      size: uploaded.size,
      adminId: admin.id,
    });
    return NextResponse.json({
      uploaded: true,
      fileName: uploaded.fileName,
      size: uploaded.size,
    });
  } catch (error) {
    console.error("Private product upload failed", error);
    return NextResponse.json(
      { error: "Unable to store the private product file." },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  if (product.downloadKey) {
    await deleteProductFile(product.downloadKey);
  }

  await updateProduct(id, {
    downloadKey: "",
    downloadName: "",
    downloadSize: 0,
  });

  return NextResponse.json({ removed: true });
}

export async function PATCH(request: Request, context: RouteContext) {
  await requireAdmin();
  const { id } = await context.params;
  const body = (await request.json()) as { downloadName?: string };
  const downloadName = typeof body.downloadName === "string" ? body.downloadName.trim() : "";
  if (!downloadName) {
    return NextResponse.json({ error: "Provide a valid file name." }, { status: 400 });
  }

  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  if (!product.downloadKey) {
    return NextResponse.json({ error: "This product does not have a file attached." }, { status: 400 });
  }

  await updateProduct(id, { downloadName });

  return NextResponse.json({ updated: true, downloadName });
}
