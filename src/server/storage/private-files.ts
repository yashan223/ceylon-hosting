import { mkdir, readFile, writeFile, unlink, rm } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { randomBytes } from "node:crypto";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/server/db/supabase";

const BUCKET_NAME = "product-files";

function getFilesRoot() {
  const configured = process.env.PRODUCT_FILES_ROOT;
  if (configured) {
    return resolve(/*turbopackIgnore: true*/ configured);
  }
  return join(process.cwd(), ".private-product-files");
}

function safeFileName(fileName: string) {
  return (
    basename(fileName)
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 120) || "download"
  );
}

function safeProductId(productId: string) {
  return productId.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function assertInsideRoot(filePath: string) {
  const root = getFilesRoot();
  const resolvedPath = resolve(filePath);
  const pathFromRoot = relative(root, resolvedPath);
  if (
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    root === resolvedPath
  )
    throw new Error("Invalid private file path.");
}

export async function uploadProductFile(productId: string, file: File) {
  const fileName = `${randomBytes(16).toString("hex")}-${safeFileName(file.name)}`;
  const storagePath = `products/${safeProductId(productId)}/${fileName}`;
  const contentType = file.type || "application/octet-stream";
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (!error) {
        return {
          key: storagePath,
          fileName: safeFileName(file.name),
          contentType,
          size: file.size,
        };
      }
      console.warn("Supabase storage upload error:", error);
    } catch (err) {
      console.warn("Supabase storage exception:", err);
    }
  }

  const root = getFilesRoot();
  const directory = join(root, "products", safeProductId(productId));
  await mkdir(directory, { recursive: true });
  const filePath = join(directory, fileName);
  assertInsideRoot(filePath);
  await writeFile(filePath, buffer, { flag: "wx" });
  return {
    key: relative(root, filePath).replace(/\\/g, "/"),
    fileName: safeFileName(file.name),
    contentType,
    size: file.size,
  };
}

export async function readProductFile(key: string): Promise<Buffer> {
  const normalizedKey = key.replace(/\\/g, "/");

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .download(normalizedKey);

      if (data && !error) {
        return Buffer.from(await data.arrayBuffer());
      }
    } catch {}
  }

  const root = getFilesRoot();
  const localKey = key.replace(/[/\\]+/g, sep);
  const filePath = resolve(root, localKey);
  assertInsideRoot(filePath);
  return readFile(/*turbopackIgnore: true*/ filePath);
}

export async function deleteProductFile(key: string): Promise<void> {
  const normalizedKey = key.replace(/\\/g, "/");

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      await supabase.storage.from(BUCKET_NAME).remove([normalizedKey]);
    } catch {}
  }

  try {
    const root = getFilesRoot();
    const localKey = key.replace(/[/\\]+/g, sep);
    const filePath = resolve(root, localKey);
    assertInsideRoot(filePath);
    await unlink(filePath);
  } catch {}
}

export async function clearAllPrivateProductFiles(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data: files } = await supabase.storage.from(BUCKET_NAME).list("products", {
        limit: 1000,
      });
      if (files && files.length > 0) {
        const paths = files.map((f) => `products/${f.name}`);
        await supabase.storage.from(BUCKET_NAME).remove(paths);
      }
    } catch (err) {
      console.warn("Failed to clear Supabase storage:", err);
    }
  }

  try {
    const root = getFilesRoot();
    const productsDir = join(root, "products");
    await rm(productsDir, { recursive: true, force: true });
    await mkdir(productsDir, { recursive: true });
  } catch (error) {
    console.error("Failed to clear local private product files:", error);
  }
}
