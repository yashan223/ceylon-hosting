export { cn } from "cn";

export function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatOrderReference(id?: string): string {
  if (!id) return "";
  return id.replace(/^loadout[-_]?/i, "ORD-").toUpperCase();
}
