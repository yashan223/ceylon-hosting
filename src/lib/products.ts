export interface ParsedProductDetails {
  summary: string;
  features: string[];
}

function isLikelySpec(str: string): boolean {
  if (!str || str.length > 50) return false;
  const words = str.split(/\s+/).filter(Boolean);
  if (words.length > 7) return false;
  if (str.endsWith(".") || str.endsWith("!") || str.endsWith("?")) return false;
  return true;
}

export function parseProductDetails(product: {
  meta?: string | null;
  description?: string | null;
}): ParsedProductDetails {
  const metaFeatures: string[] = [];
  const delimiterRegex = /[·•|;]|\s+[/]\s+|\s{2,}/;
  const bulletMarkerRegex = /^(?:[-*•+✓✔]|\d+[.)])\s+/;

  if (product.meta) {
    const raw = product.meta.trim();
    if (raw) {
      if (delimiterRegex.test(raw)) {
        const items = raw
          .split(delimiterRegex)
          .map((item) => item.replace(bulletMarkerRegex, "").trim())
          .filter(Boolean);
        metaFeatures.push(...items);
      } else if (raw.includes(",")) {
        const items = raw
          .split(",")
          .map((item) => item.replace(bulletMarkerRegex, "").trim())
          .filter(Boolean);
        if (items.length > 1) {
          metaFeatures.push(...items);
        } else if (items.length === 1) {
          metaFeatures.push(items[0]);
        }
      } else {
        const single = raw.replace(bulletMarkerRegex, "").trim();
        if (single) metaFeatures.push(single);
      }
    }
  }

  const rawDesc = (product.description ?? "").trim();
  if (!rawDesc) {
    return {
      summary: "",
      features: Array.from(new Set(metaFeatures)).filter(Boolean),
    };
  }

  const lines = rawDesc
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const descFeatures: string[] = [];
  const summaryLines: string[] = [];

  const hasAnyBullets = lines.some((l) => bulletMarkerRegex.test(l));

  if (hasAnyBullets) {
    for (const line of lines) {
      if (bulletMarkerRegex.test(line)) {
        descFeatures.push(line.replace(bulletMarkerRegex, "").trim());
      } else {
        summaryLines.push(line);
      }
    }
  } else if (lines.length > 1) {
    const allLikelySpecs = lines.every(isLikelySpec);
    if (allLikelySpecs) {
      descFeatures.push(...lines);
    } else {
      const firstLineIsSpec = isLikelySpec(lines[0]);
      if (!firstLineIsSpec) {
        summaryLines.push(lines[0]);
        const restSpecs = lines.slice(1).every(isLikelySpec);
        if (restSpecs) {
          descFeatures.push(...lines.slice(1));
        } else {
          summaryLines.push(...lines.slice(1));
        }
      } else {
        summaryLines.push(...lines);
      }
    }
  } else if (lines.length === 1) {
    const single = lines[0];
    if (delimiterRegex.test(single)) {
      const parts = single
        .split(delimiterRegex)
        .map((p) => p.replace(bulletMarkerRegex, "").trim())
        .filter(Boolean);
      if (parts.length > 1) {
        descFeatures.push(...parts);
      } else {
        summaryLines.push(single);
      }
    } else if (single.includes(",")) {
      const parts = single
        .split(",")
        .map((p) => p.replace(bulletMarkerRegex, "").trim())
        .filter(Boolean);
      if (parts.length > 1 && parts.every(isLikelySpec)) {
        descFeatures.push(...parts);
      } else {
        summaryLines.push(single);
      }
    } else {
      summaryLines.push(single);
    }
  }

  const combinedFeatures = Array.from(new Set([...metaFeatures, ...descFeatures])).filter(Boolean);

  return {
    summary: summaryLines.join("\n"),
    features: combinedFeatures,
  };
}

export function parseProductFeatures(product: {
  meta?: string | null;
  description?: string | null;
}): string[] {
  return parseProductDetails(product).features;
}
