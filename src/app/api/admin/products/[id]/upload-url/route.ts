import { NextResponse } from "next/server";
import { getAdminApiUser } from "@/server/auth/admin";
import { createProductUploadSignedUrl } from "@/server/storage/private-files";
import { getProductById } from "@/server/catalog/products";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";

export async function POST(request: Request, context: RouteContext) {
  const admin = await getAdminApiUser();
  if (!admin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 401 });
  }

  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    fileName?: string;
  };

  if (!body.fileName || typeof body.fileName !== "string") {
    return NextResponse.json({ error: "Missing fileName." }, { status: 400 });
  }

  const uploadInfo = await createProductUploadSignedUrl(id, body.fileName);
  if (!uploadInfo) {
    return NextResponse.json({ directUpload: false });
  }

  return NextResponse.json({
    directUpload: true,
    signedUrl: uploadInfo.signedUrl,
    storagePath: uploadInfo.storagePath,
    fileName: uploadInfo.fileName,
  });
}
