"use client";

import Image from "next/image";
import Link from "next/link";
import {
  X,
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  FileText,
  Search,
  AlertCircle,
  Camera,
  MapPin,
  Download,
  UploadCloud,
  Check,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { SERVER_LOCATIONS } from "@/lib/datacenters";
import { parseProductDetails } from "@/lib/products";
import type { Product, ProductType } from "@/types/product";

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ProductManagerProps = {
  products: Product[];
  title?: string;
  kicker?: string;
  isDashboardView?: boolean;
};

type Draft = {
  name: string;
  type: ProductType;
  description: string;
  location?: string;
  locations?: string[];
  meta: string;
  price: string;
  accent: string;
  active: boolean;
  available: boolean;
  tag: string;
  imageUrl?: string;
  images?: string[];
};

const blankDraft: Draft = {
  name: "",
  type: "server",
  description: "",
  location: "",
  locations: [],
  meta: "",
  price: "",
  accent: "slate",
  active: true,
  available: true,
  tag: "",
  imageUrl: "",
  images: [],
};

export function ProductManager({
  products: initialProducts,
  title = "Products",
  kicker = "Live catalog",
  isDashboardView = false,
}: ProductManagerProps) {
  const [products, setProducts] = useState(initialProducts);
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [extraImageFiles, setExtraImageFiles] = useState<File[]>([]);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [customLocInput, setCustomLocInput] = useState("");

  const customSelectedLocations = useMemo(() => {
    return (draft.locations || []).filter(
      (loc) => !SERVER_LOCATIONS.some((sl) => sl.label.toLowerCase() === loc.toLowerCase()),
    );
  }, [draft.locations]);

  function changeDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleLocation(label: string) {
    const current = draft.locations || [];
    const exists = current.includes(label);
    const next = exists ? current.filter((l) => l !== label) : [...current, label];
    changeDraft("locations", next);
    if (draft.location === label && exists) {
      changeDraft("location", next[0] || "");
    } else if (!draft.location && !exists) {
      changeDraft("location", label);
    }
  }

  function selectAllLocations() {
    const allLabels = SERVER_LOCATIONS.map((l) => l.label);
    const current = draft.locations || [];
    const merged = Array.from(new Set([...current, ...allLabels]));
    changeDraft("locations", merged);
    if (!draft.location && merged.length > 0) {
      changeDraft("location", merged[0]);
    }
  }

  function clearAllLocations() {
    changeDraft("locations", []);
    changeDraft("location", "");
  }

  function addCustomLocation() {
    const clean = customLocInput.trim();
    if (!clean) return;
    const current = draft.locations || [];
    if (!current.some((l) => l.toLowerCase() === clean.toLowerCase())) {
      const next = [...current, clean];
      changeDraft("locations", next);
      if (!draft.location) changeDraft("location", clean);
    }
    setCustomLocInput("");
  }

  function openCreate() {
    setEditingProduct(null);
    setDraft({
      ...blankDraft,
      locations: SERVER_LOCATIONS.map((loc) => loc.label),
      location: SERVER_LOCATIONS[0].label,
    });
    setExtraImageFiles([]);
    setGalleryUrls([]);
    setDownloadFile(null);
    setStatus("");
    setCustomLocInput("");
    setIsEditorOpen(true);
  }

  function editProduct(product: Product) {
    setEditingProduct(product);
    const existingImages =
      product.images && product.images.length > 0
        ? product.images
        : product.imageUrl
          ? [product.imageUrl]
          : [];
    const initialLocations: string[] =
      product.locations && product.locations.length > 0
        ? product.locations
        : product.location && product.location.trim()
          ? [product.location.trim()]
          : [];
    setDraft({
      name: product.name,
      type: product.type,
      description: product.description,
      location: product.location ?? initialLocations[0] ?? "",
      locations: initialLocations,
      meta: product.meta ?? "",
      price: String(product.price),
      accent: product.accent || "slate",
      active: product.active !== false,
      available: product.available !== false,
      tag: product.tag ?? "",
      imageUrl: product.imageUrl ?? "",
      images: existingImages,
    });
    setExtraImageFiles([]);
    setGalleryUrls(existingImages);
    setDownloadFile(null);
    setStatus("");
    setCustomLocInput("");
    setIsEditorOpen(true);
  }

  function closeEditor() {
    setIsEditorOpen(false);
    setEditingProduct(null);
    setDraft(blankDraft);
    setExtraImageFiles([]);
    setGalleryUrls([]);
    setDownloadFile(null);
    setStatus("");
    setCustomLocInput("");
    setIsSaving(false);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus("");

    try {
      const coverUrl = galleryUrls[0] ?? "";
      const payload: Record<string, unknown> = {
        name: draft.name.trim(),
        type: draft.type,
        description: draft.description.trim(),
        meta: (draft.meta ?? "").trim(),
        price: Number(draft.price),
        accent: draft.accent,
        active: draft.active,
        available: draft.available,
        tag: draft.tag.trim(),
        images: galleryUrls,
        imageUrl: coverUrl,
      };
      if (draft.type === "server") {
        const cleanLocations = (draft.locations || []).map((l) => l.trim()).filter(Boolean);
        if (cleanLocations.length === 0) {
          setStatus("Please select at least one available datacenter location for this server.");
          setIsSaving(false);
          return;
        }
        payload.locations = cleanLocations;
        payload.location = (draft.location || cleanLocations[0] || "").trim();
      }

      const response = await fetch(
        editingProduct ? `/api/admin/products/${editingProduct.id}` : "/api/admin/products",
        {
          method: editingProduct ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as { product?: Product; error?: string };
      if (!response.ok) {
        setStatus(result.error ?? "Unable to save product.");
        setIsSaving(false);
        return;
      }

      const productId = editingProduct ? editingProduct.id : result.product?.id;
      if (!productId) {
        setStatus("Product saved, but record ID was missing.");
        setIsSaving(false);
        return;
      }

      let imageUrl = coverUrl;
      let downloadName = editingProduct
        ? editingProduct.downloadName
        : result.product?.downloadName;
      let downloadSize = editingProduct
        ? editingProduct.downloadSize
        : result.product?.downloadSize;
      let finalImages = [...galleryUrls];

      if (extraImageFiles.length > 0) {
        const extraForm = new FormData();
        for (const file of extraImageFiles) {
          extraForm.append("files", file);
        }
        const extraResponse = await fetch(`/api/admin/products/${productId}/images`, {
          method: "POST",
          body: extraForm,
        });
        const extraResult = (await extraResponse.json()) as { images?: string[]; error?: string };
        if (extraResponse.ok && Array.isArray(extraResult.images)) {
          finalImages = extraResult.images;
          if (finalImages.length > 0) {
            imageUrl = finalImages[0];
          }
        } else if (!extraResponse.ok) {
          setStatus(extraResult.error ?? "Product saved, but image upload failed.");
          setIsSaving(false);
          return;
        }
      }

      if (downloadFile) {
        const fileForm = new FormData();
        fileForm.append("file", downloadFile);
        const fileResponse = await fetch(`/api/admin/products/${productId}/file`, {
          method: "POST",
          body: fileForm,
        });
        const fileResult = (await fileResponse.json()) as { fileName?: string; size?: number; error?: string };
        if (fileResponse.ok && fileResult.fileName) {
          downloadName = fileResult.fileName;
          downloadSize = fileResult.size;
        } else if (!fileResponse.ok) {
          setStatus(fileResult.error ?? "Product saved, but file attachment failed.");
          setIsSaving(false);
          return;
        }
      }

      if (editingProduct) {
        setProducts((current) =>
          current.map((item) =>
            item.id === editingProduct.id
              ? {
                  ...item,
                  ...payload,
                  imageUrl,
                  images: finalImages,
                  downloadName,
                  downloadSize,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
      } else if (result.product) {
        setProducts((current) => [
          {
            ...result.product!,
            ...payload,
            imageUrl,
            images: finalImages,
            downloadName,
            downloadSize,
          },
          ...current,
        ]);
      }

      closeEditor();
    } catch {
      setStatus("A network error occurred while saving the item.");
    } finally {
      setIsSaving(false);
    }
  }

  async function removeAttachedFile() {
    if (!editingProduct) return;
    setIsDeletingFile(true);
    setStatus("");
    try {
      const response = await fetch(`/api/admin/products/${editingProduct.id}/file`, {
        method: "DELETE",
      });
      if (response.ok) {
        setEditingProduct((prev) =>
          prev
            ? {
                ...prev,
                downloadKey: undefined,
                downloadName: undefined,
                downloadSize: undefined,
              }
            : null,
        );
        setProducts((current) =>
          current.map((item) =>
            item.id === editingProduct.id
              ? {
                  ...item,
                  downloadKey: undefined,
                  downloadName: undefined,
                  downloadSize: undefined,
                }
              : item,
          ),
        );
      } else {
        const data = (await response.json()) as { error?: string };
        setStatus(data.error ?? "Failed to delete attached file.");
      }
    } catch {
      setStatus("Network error while removing attached file.");
    } finally {
      setIsDeletingFile(false);
    }
  }

  async function toggleProduct(product: Product) {
    const nextActive = !product.active;
    await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: nextActive }),
    });
    setProducts((current) =>
      current.map((item) => (item.id === product.id ? { ...item, active: nextActive } : item)),
    );
  }

  async function toggleAvailability(product: Product) {
    const nextAvailable = product.available === false;
    await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: nextAvailable }),
    });
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? { ...item, available: nextAvailable } : item,
      ),
    );
  }

  function deleteProduct(product: Product) {
    setProductToDelete(product);
  }

  async function confirmDeleteProduct() {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/products/${productToDelete.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setProducts((current) => current.filter((item) => item.id !== productToDelete.id));
        setProductToDelete(null);
      } else {
        setStatus("Unable to delete product.");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const counts = useMemo(() => {
    return {
      all: products.length,
      server: products.filter((p) => p.type === "server").length,
      mod: products.filter((p) => p.type === "mod").length,
      service: products.filter((p) => p.type === "service").length,
    };
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (filterType !== "all" && product.type !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesMeta = product.meta ? product.meta.toLowerCase().includes(query) : false;
        const matchesTag = product.tag?.toLowerCase().includes(query);
        const matchesDesc = product.description.toLowerCase().includes(query);
        const matchesLoc =
          product.location?.toLowerCase().includes(query) ||
          product.locations?.some((l) => l.toLowerCase().includes(query));
        if (!matchesName && !matchesMeta && !matchesTag && !matchesDesc && !matchesLoc) return false;
      }
      return true;
    });
  }, [products, filterType, searchQuery]);

  return (
    <div className="product-manager">
      <section className="admin-panel product-cards-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-kicker">{kicker}</span>
            <h2>{title}</h2>
          </div>
          <div className="product-panel-actions">
            <span className="admin-panel-meta">{products.length} total items</span>
            {isDashboardView && (
              <Link className="admin-store-link" href="/admin/products">
                Full catalog <span>↗</span>
              </Link>
            )}
            <Button size="sm" type="button" onClick={openCreate}>
              <Plus size={14} style={{ marginRight: 4 }} />
              Add item
            </Button>
          </div>
        </div>

        <div className="admin-catalog-toolbar">
          <div className="admin-catalog-tabs">
            <button
              type="button"
              className={`admin-tab-btn ${filterType === "all" ? "active" : ""}`}
              onClick={() => setFilterType("all")}
            >
              All <span>({counts.all})</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filterType === "server" ? "active" : ""}`}
              onClick={() => setFilterType("server")}
            >
              Servers <span>({counts.server})</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filterType === "mod" ? "active" : ""}`}
              onClick={() => setFilterType("mod")}
            >
              Mods & tools <span>({counts.mod})</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filterType === "service" ? "active" : ""}`}
              onClick={() => setFilterType("service")}
            >
              Services <span>({counts.service})</span>
            </button>
          </div>
          <div className="admin-catalog-search">
            <Search size={14} className="admin-search-icon" />
            <input
              type="search"
              placeholder="Search items, specs, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-search-input"
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="admin-empty">
            <p>
              {products.length === 0
                ? "No products found in the catalog."
                : "No items match your filter criteria."}
            </p>
          </div>
        ) : (
          <div className="admin-product-grid">
            {filteredProducts.map((product) => {
              const isAvailable = product.available !== false;
              const { summary: cleanDescription, features } = parseProductDetails(product);
              return (
                <article className="admin-product-card" key={product.id}>
                  <div className={`admin-product-art product-art-${product.accent || "slate"}`}>
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={400}
                        height={240}
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span>{product.type.toUpperCase()}</span>
                    )}

                    <div className="admin-card-art-badges">
                      {product.images && product.images.length > 1 && (
                        <span
                          className="admin-badge admin-badge-tag"
                          style={{
                            background: "rgba(15, 23, 42, 0.85)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Camera size={11} /> {product.images.length}
                        </span>
                      )}
                      {product.tag && (
                        <span className="admin-badge admin-badge-tag">{product.tag}</span>
                      )}
                      <span
                        className={`admin-badge ${product.active ? "admin-badge-active" : "admin-badge-draft"}`}
                      >
                        {product.active ? "Live" : "Draft"}
                      </span>
                    </div>
                  </div>

                  <div className="admin-product-card-body">
                    <div>
                      <div className="admin-card-header-row">
                        <span className="admin-kicker">{product.type}</span>
                        <button
                          type="button"
                          className={`admin-availability-pill ${isAvailable ? "available" : "unavailable"}`}
                          onClick={() => void toggleAvailability(product)}
                          title="Click to toggle availability"
                        >
                          {isAvailable ? "Available" : "Unavailable"}
                        </button>
                      </div>
                      <h3>{product.name}</h3>
                      {cleanDescription && <p>{cleanDescription}</p>}
                      {features.length > 0 && (
                        <ul className="admin-card-feature-points" aria-label="Product features">
                          {features.map((feature, idx) => (
                            <li key={idx} className="admin-card-feature-point">
                              <Check size={11} className="admin-card-feature-icon" strokeWidth={2.5} />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="admin-card-specs-row">
                      {product.type === "server" && (product.locations?.length || product.location) && (
                        <span className="admin-card-location">
                          <MapPin size={11} />
                          {product.locations && product.locations.length > 1
                            ? `${product.locations.length} Locations`
                            : product.locations?.[0] || product.location}
                        </span>
                      )}
                      {product.meta && <span className="admin-card-meta">{product.meta}</span>}
                      {product.downloadName && (
                        <span
                          className="admin-card-download-indicator"
                          title="Downloadable file attached"
                        >
                          <FileText size={11} /> {product.downloadName}
                          {product.downloadSize ? ` (${formatBytes(product.downloadSize)})` : ""}
                        </span>
                      )}
                    </div>

                    <div className="admin-card-price-row">
                      <strong>Rs. {product.price.toLocaleString("en-LK")}</strong>
                      <span className="admin-card-id">{product.id}</span>
                    </div>

                    <div className="admin-product-actions">
                      <button
                        type="button"
                        className="admin-action-link edit"
                        onClick={() => editProduct(product)}
                        title="Edit this item"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-action-link"
                        onClick={() => void toggleProduct(product)}
                        title={product.active ? "Hide from store" : "Publish to store"}
                      >
                        {product.active ? (
                          <>
                            <EyeOff size={12} />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye size={12} />
                            Show
                          </>
                        )}
                      </button>
                      <button
                        className="admin-action-link danger"
                        type="button"
                        onClick={() => void deleteProduct(product)}
                        title="Delete this item"
                      >
                        <Trash2 size={12} />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isEditorOpen && (
        <div
          className="product-modal"
          role="dialog"
          aria-modal="true"
          aria-label={editingProduct ? "Edit item" : "Add item"}
        >
          <div className="product-modal-container">
            <div className="product-modal-header">
              <div>
                <span className="admin-kicker">
                  {editingProduct ? `Editing item: ${editingProduct.id}` : "Catalog operations"}
                </span>
                <h2>{editingProduct ? "Edit item details" : "Add new item"}</h2>
              </div>
              <button
                className="product-modal-close"
                type="button"
                onClick={closeEditor}
                aria-label="Close product editor"
              >
                <X size={20} />
              </button>
            </div>

            <form className="product-editor-form" onSubmit={saveProduct}>
              <label>
                Name *
                <Input
                  value={draft.name}
                  onChange={(event) => changeDraft("name", event.target.value)}
                  required
                />
              </label>

              <label>
                Type *
                <select
                  value={draft.type}
                  onChange={(event) => changeDraft("type", event.target.value as ProductType)}
                >
                  <option value="server">Server Plan</option>
                  <option value="mod">Mod / Tool</option>
                  <option value="service">Remote Service</option>
                </select>
              </label>

              {draft.type === "server" && (
                <div className="admin-location-box">
                  <div className="admin-location-header">
                    <span>Available Datacenter Locations *</span>
                    <div className="admin-location-actions">
                      <button
                        type="button"
                        className="admin-location-btn"
                        onClick={selectAllLocations}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        className="admin-location-btn"
                        onClick={clearAllLocations}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  <div className="admin-location-grid">
                    {SERVER_LOCATIONS.map((loc) => {
                      const isSelected = (draft.locations || []).includes(loc.label);
                      return (
                        <label
                          key={loc.id}
                          className={`admin-location-chip ${isSelected ? "selected" : ""}`}
                          onClick={(e) => {
                            e.preventDefault();
                            toggleLocation(loc.label);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            tabIndex={-1}
                          />
                          <span>{loc.flag}</span>
                          <span>{loc.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="admin-custom-loc-row">
                    <Input
                      placeholder="Add custom location (e.g. Dallas, USA)"
                      value={customLocInput}
                      onChange={(e) => setCustomLocInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomLocation();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomLocation}
                      disabled={!customLocInput.trim()}
                    >
                      Add Location
                    </Button>
                  </div>
                  {customSelectedLocations.length > 0 && (
                    <div className="admin-custom-tags">
                      {customSelectedLocations.map((loc) => (
                        <span key={loc} className="admin-custom-tag">
                          📍 {loc}
                          <button
                            type="button"
                            onClick={() => {
                              const next = (draft.locations || []).filter((l) => l !== loc);
                              changeDraft("locations", next);
                            }}
                            aria-label={`Remove ${loc}`}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  {(!draft.locations || draft.locations.length === 0) && (
                    <span className="admin-field-error">
                      At least one datacenter location must be selected.
                    </span>
                  )}
                </div>
              )}

              <label>
                Price (Rs.) *
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.price}
                  onChange={(event) => changeDraft("price", event.target.value)}
                  required
                />
              </label>

              <label>
                Promotional Tag / Badge
                <Input
                  value={draft.tag}
                  onChange={(event) => changeDraft("tag", event.target.value)}
                />
              </label>

              <div className="product-editor-toggle-row">
                <div className="admin-toggle-card">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.available}
                      onChange={(e) => changeDraft("available", e.target.checked)}
                    />
                    <div>
                      <strong>Available for Order</strong>
                      <small>
                        If unchecked, customers see &quot;Unavailable&quot; and cannot order.
                      </small>
                    </div>
                  </label>
                </div>

                <div className="admin-toggle-card">
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={draft.active}
                      onChange={(e) => changeDraft("active", e.target.checked)}
                    />
                    <div>
                      <strong>Active (Published)</strong>
                      <small>If unchecked, item is hidden from the public store catalog.</small>
                    </div>
                  </label>
                </div>
              </div>

              <div className="product-editor-wide">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <label style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                    Product Images & Gallery
                  </label>
                  <span className="admin-gallery-pill">
                    <Camera size={12} /> First image is Cover
                  </span>
                </div>

                <div className="admin-file-upload-box admin-gallery-box">
                  {galleryUrls.length > 0 && (
                    <div>
                      <small style={{ display: "block", marginBottom: 8, color: "#64748b" }}>
                        Saved images ({galleryUrls.length}):
                      </small>
                      <div className="admin-gallery-items-grid">
                        {galleryUrls.map((url, idx) => (
                          <div key={url + idx} className="admin-gallery-item-card">
                            <img src={url} alt={`Product image ${idx + 1}`} />
                            <span
                              className="admin-gallery-item-badge"
                              style={{ background: idx === 0 ? "#16a34a" : "rgba(15, 23, 42, 0.85)" }}
                            >
                              {idx === 0 ? "Cover" : `#${idx + 1}`}
                            </span>
                            {idx > 0 && (
                              <button
                                type="button"
                                className="admin-gallery-item-make-cover"
                                title="Set as cover image"
                                onClick={() => {
                                  const nextList = [
                                    url,
                                    ...galleryUrls.filter((_, i) => i !== idx),
                                  ];
                                  setGalleryUrls(nextList);
                                  changeDraft("imageUrl", nextList[0]);
                                }}
                              >
                                Set Cover
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-gallery-item-remove"
                              title="Remove image"
                              onClick={() => {
                                const nextList = galleryUrls.filter((_, i) => i !== idx);
                                setGalleryUrls(nextList);
                                changeDraft("imageUrl", nextList[0] ?? "");
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extraImageFiles.length > 0 && (
                    <div style={{ marginTop: galleryUrls.length > 0 ? 10 : 0 }}>
                      <small
                        style={{
                          display: "block",
                          marginBottom: 8,
                          color: "#0284c7",
                          fontWeight: 600,
                        }}
                      >
                        Pending upload ({extraImageFiles.length} file
                        {extraImageFiles.length > 1 ? "s" : ""}):
                      </small>
                      <div className="admin-gallery-items-grid">
                        {extraImageFiles.map((file, idx) => (
                          <div
                            key={file.name + idx}
                            className="admin-gallery-item-card"
                            style={{ borderColor: "#38bdf8" }}
                          >
                            <img src={URL.createObjectURL(file)} alt={file.name} />
                            <span
                              className="admin-gallery-item-badge"
                              style={{ background: "#0284c7" }}
                            >
                              {galleryUrls.length === 0 && idx === 0 ? "Cover" : "New"}
                            </span>
                            <button
                              type="button"
                              className="admin-gallery-item-remove"
                              title="Remove new image"
                              onClick={() =>
                                setExtraImageFiles((prev) => prev.filter((_, i) => i !== idx))
                              }
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <label
                    style={{
                      display: "block",
                      cursor: "pointer",
                      marginTop: galleryUrls.length > 0 || extraImageFiles.length > 0 ? 10 : 0,
                    }}
                  >
                    <input
                      accept="image/*"
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      onChange={(event) => {
                        const selected = Array.from(event.target.files ?? []);
                        if (selected.length > 0) {
                          setExtraImageFiles((prev) => [...prev, ...selected]);
                        }
                        event.target.value = "";
                      }}
                    />
                    <div
                      style={{
                        border: "1.5px dashed #94a3b8",
                        borderRadius: 8,
                        padding: "14px 16px",
                        textAlign: "center",
                        background: "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#2563eb",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        <Camera size={15} />
                        <span>
                          {galleryUrls.length > 0 || extraImageFiles.length > 0
                            ? "Add More Images"
                            : "Upload Product Images (Select one or multiple)"}
                        </span>
                      </div>
                      <small style={{ display: "block", color: "#64748b", marginTop: 2 }}>
                        Upload PNG, JPG, or WebP (up to 10MB each). First image is used as the cover.
                      </small>
                    </div>
                  </label>
                </div>
              </div>

              <div className="product-editor-wide">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <label style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>
                    Downloadable File (Digital Delivery)
                  </label>
                  <span className="admin-gallery-pill">
                    <FileText size={12} /> Max 500 MB
                  </span>
                </div>

                <div className="admin-file-upload-box">
                  {editingProduct?.downloadName && !downloadFile && (
                    <div className="admin-attached-file-card">
                      <div className="admin-attached-file-info">
                        <FileText size={18} className="admin-attached-file-icon" />
                        <div>
                          <strong>{editingProduct.downloadName}</strong>
                          <small>
                            {editingProduct.downloadSize
                              ? formatBytes(editingProduct.downloadSize)
                              : "Stored securely on server"}
                          </small>
                        </div>
                      </div>
                      <div className="admin-attached-file-actions">
                        <a
                          href={`/api/admin/products/${editingProduct.id}/file`}
                          className="admin-file-action-btn test"
                          download={editingProduct.downloadName}
                          title="Test download file"
                        >
                          <Download size={12} />
                          <span>Test Download</span>
                        </a>
                        <button
                          type="button"
                          className="admin-file-action-btn danger"
                          onClick={() => void removeAttachedFile()}
                          disabled={isDeletingFile}
                          title="Remove file from storage"
                        >
                          <Trash2 size={12} />
                          <span>{isDeletingFile ? "Removing..." : "Remove"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {downloadFile && (
                    <div className="admin-pending-file-card">
                      <div className="admin-attached-file-info">
                        <UploadCloud size={18} className="admin-pending-file-icon" />
                        <div>
                          <strong>{downloadFile.name}</strong>
                          <small>{formatBytes(downloadFile.size)} (Pending upload on save)</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="admin-file-action-btn danger"
                        onClick={() => setDownloadFile(null)}
                        title="Cancel selected file"
                      >
                        <X size={12} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  )}

                  <label style={{ display: "block", cursor: "pointer", marginTop: 6 }}>
                    <input
                      type="file"
                      accept=".zip,.rar,.7z,.tar,.gz,.bin,.json,.cfg,.txt"
                      style={{ display: "none" }}
                      onChange={(event) => {
                        setDownloadFile(event.target.files?.[0] ?? null);
                        event.target.value = "";
                      }}
                    />
                    <div
                      style={{
                        border: "1.5px dashed #94a3b8",
                        borderRadius: 8,
                        padding: "12px 16px",
                        textAlign: "center",
                        background: "#f8fafc",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#2563eb",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        <UploadCloud size={15} />
                        <span>
                          {downloadFile || editingProduct?.downloadName
                            ? "Replace Downloadable File"
                            : "Upload Digital File (ZIP, RAR, 7Z, CFG up to 500MB)"}
                        </span>
                      </div>
                      <small style={{ display: "block", color: "#64748b", marginTop: 2 }}>
                        Digital deliveries are securely encrypted & accessible to verified buyers only.
                      </small>
                    </div>
                  </label>
                </div>
              </div>

              <label className="product-editor-wide">
                Description *
                <textarea
                  value={draft.description}
                  onChange={(event) => changeDraft("description", event.target.value)}
                  rows={4}
                  placeholder="Enter product description or specifications (separate lines or bullets will display as points)"
                  required
                />
                <small className="admin-field-tip">
                  Tip: Put specifications or features on separate lines to display them as bullet points.
                </small>
              </label>

              {status && (
                <div className="product-editor-status-banner">
                  <AlertCircle size={16} />
                  <span>{status}</span>
                </div>
              )}

              <div className="product-modal-actions">
                <Button variant="outline" type="button" onClick={closeEditor} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingProduct ? "Save changes" : "Add item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Delete Product"
        description={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete product"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDeleteProduct}
      />
    </div>
  );
}
