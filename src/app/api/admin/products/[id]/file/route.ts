import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/server/auth/admin";
import { getProductById, updateProduct } from "@/server/catalog/products";
import {
  uploadProductFile,
  readProductFile,
  deleteProductFile,
  getProductDownloadSignedUrl,
} from "@/server/storage/private-files";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const admin = await getAdminApiUser();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product?.downloadKey || !product.downloadName)
    return NextResponse.json({ error: "No file found for this product." }, { status: 404 });

  const signedUrl = await getProductDownloadSignedUrl(product.downloadKey, product.downloadName);
  if (signedUrl) {
    return NextResponse.redirect(signedUrl);
  }

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
  const admin = await getAdminApiUser();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as {
      storagePath?: string;
      fileName?: string;
      size?: number;
    };

    if (!body.storagePath || !body.fileName) {
      return NextResponse.json({ error: "Invalid file metadata." }, { status: 400 });
    }

    if (product.downloadKey && product.downloadKey !== body.storagePath) {
      await deleteProductFile(product.downloadKey);
    }

    await updateProduct(id, {
      downloadKey: body.storagePath,
      downloadName: body.fileName,
      downloadSize: Number(body.size) || 0,
    });

    return NextResponse.json({
      uploaded: true,
      fileName: body.fileName,
      size: Number(body.size) || 0,
    });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File))
    return NextResponse.json({ error: "Attach a file." }, { status: 400 });
  if (file.size === 0 || file.size > 500 * 1024 * 1024)
    return NextResponse.json({ error: "File must be between 1 byte and 500 MB." }, { status: 400 });

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
  const admin = await getAdminApiUser();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

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
  const admin = await getAdminApiUser();
  if (!admin) return NextResponse.json({ error: "Admin access required." }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { downloadName?: string };
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
