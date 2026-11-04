import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { getPaidOrderForProduct, recordOrderEvent } from "@/server/orders/orders";
import { getProductById } from "@/server/catalog/products";
import { readProductFile, getProductDownloadSignedUrl } from "@/server/storage/private-files";

type RouteContext = { params: Promise<{ productId: string }> };

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const { productId } = await context.params;
  const order = await getPaidOrderForProduct(user.id, productId);
  if (!order) {
    return NextResponse.json(
      { error: "This download is not available. Please ensure your purchase is completed and paid." },
      { status: 403 },
    );
  }

  const product = await getProductById(productId);
  if (!product?.downloadKey || !product.downloadName) {
    return NextResponse.json(
      { error: "This product does not have a downloadable file attached yet." },
      { status: 404 },
    );
  }

  try {
    const signedUrl = await getProductDownloadSignedUrl(product.downloadKey, product.downloadName);
    if (signedUrl) {
      await recordOrderEvent(order.id, "download.authorized", user.id, productId);
      return NextResponse.redirect(signedUrl);
    }

    const file = await readProductFile(product.downloadKey);
    await recordOrderEvent(order.id, "download.authorized", user.id, productId);

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${product.downloadName.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "The file is currently unavailable on storage." }, { status: 404 });
  }
}
