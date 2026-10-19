"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import {
  FileText,
  Download,
  Trash2,
  Pencil,
  Plus,
  Search,
  HardDrive,
  UploadCloud,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  Database,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { formatBytes } from "@/lib/utils";
import type { Product } from "@/types/product";

type FileManagerProps = {
  products: Product[];
};

export function FileManager({ products: initialProducts }: FileManagerProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [filterTab, setFilterTab] = useState<"stored" | "missing" | "all">("stored");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isEditDragging, setIsEditDragging] = useState(false);

  const [isAttachOpen, setIsAttachOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const targetSelectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId],
  );

  useEffect(() => {
    if (!isAttachOpen && !editingProduct) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isAttachOpen) closeAttach();
        if (editingProduct) closeEdit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAttachOpen, editingProduct]);

  const eligibleProducts = useMemo(() => {
    return products.filter((p) => p.type !== "server");
  }, [products]);

  const stats = useMemo(() => {
    const withFiles = eligibleProducts.filter((p) => Boolean(p.downloadKey));
    const missingFiles = eligibleProducts.filter((p) => !p.downloadKey);
    const totalBytes = withFiles.reduce((acc, p) => acc + (p.downloadSize || 0), 0);
    return {
      withFilesCount: withFiles.length,
      missingFilesCount: missingFiles.length,
      totalBytes,
      totalProducts: eligibleProducts.length,
    };
  }, [eligibleProducts]);

  const filteredProducts = useMemo(() => {
    return eligibleProducts.filter((product) => {
      const hasFile = Boolean(product.downloadKey);
      if (filterTab === "stored" && !hasFile) return false;
      if (filterTab === "missing" && hasFile) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(query);
        const matchesFileName = product.downloadName ? product.downloadName.toLowerCase().includes(query) : false;
        const matchesId = product.id.toLowerCase().includes(query);
        const matchesType = product.type.toLowerCase().includes(query);
        if (!matchesName && !matchesFileName && !matchesId && !matchesType) return false;
      }

      return true;
    });
  }, [eligibleProducts, filterTab, searchQuery]);

  function openEdit(product: Product) {
    setEditingProduct(product);
    setEditName(product.downloadName || "");
    setEditFile(null);
    setStatusMessage(null);
  }

  function closeEdit() {
    setEditingProduct(null);
    setEditName("");
    setEditFile(null);
    setIsSavingEdit(false);
  }

  function openAttach(preselectedId?: string) {
    const defaultProduct = eligibleProducts.find((p) => !p.downloadKey) ?? eligibleProducts[0];
    setSelectedProductId(preselectedId || defaultProduct?.id || "");
    setAttachFile(null);
    setStatusMessage(null);
    setIsAttachOpen(true);
  }

  function closeAttach() {
    setIsAttachOpen(false);
    setSelectedProductId("");
    setAttachFile(null);
    setIsAttaching(false);
  }

  async function handleConfirmDelete() {
    if (!productToDelete) return;
    setIsDeleting(true);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/admin/products/${productToDelete.id}/file`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setStatusMessage({ text: data.error || "Failed to remove file.", isError: true });
        return;
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === productToDelete.id
            ? { ...item, downloadKey: undefined, downloadName: undefined, downloadSize: undefined }
            : item,
        ),
      );

      setStatusMessage({ text: `File for "${productToDelete.name}" successfully removed.` });
      setProductToDelete(null);
    } catch {
      setStatusMessage({ text: "Network error occurred while deleting file.", isError: true });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editingProduct) return;
    setIsSavingEdit(true);
    setStatusMessage(null);

    try {
      let finalName = editName.trim();
      let finalSize = editingProduct.downloadSize;

      if (editFile) {
        const formData = new FormData();
        formData.append("file", editFile);
        const uploadRes = await fetch(`/api/admin/products/${editingProduct.id}/file`, {
          method: "POST",
          body: formData,
        });

        const uploadData = (await uploadRes.json()) as { fileName?: string; size?: number; error?: string };
        if (!uploadRes.ok) {
          setStatusMessage({ text: uploadData.error || "Failed to upload replacement file.", isError: true });
          setIsSavingEdit(false);
          return;
        }

        finalName = uploadData.fileName || finalName;
        finalSize = uploadData.size;
      }

      if (finalName && finalName !== editingProduct.downloadName && !editFile) {
        const renameRes = await fetch(`/api/admin/products/${editingProduct.id}/file`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ downloadName: finalName }),
        });

        const renameData = (await renameRes.json()) as { downloadName?: string; error?: string };
        if (!renameRes.ok) {
          setStatusMessage({ text: renameData.error || "Failed to rename file.", isError: true });
          setIsSavingEdit(false);
          return;
        }
        finalName = renameData.downloadName || finalName;
      }

      setProducts((current) =>
        current.map((item) =>
          item.id === editingProduct.id
            ? {
                ...item,
                downloadName: finalName,
                downloadSize: finalSize,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      setStatusMessage({ text: `Updated file for "${editingProduct.name}" successfully.` });
      closeEdit();
    } catch {
      setStatusMessage({ text: "Network error occurred while saving file changes.", isError: true });
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleAttachSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedProductId || !attachFile) {
      setStatusMessage({ text: "Please select a product and attach a valid file.", isError: true });
      return;
    }

    setIsAttaching(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", attachFile);
      const res = await fetch(`/api/admin/products/${selectedProductId}/file`, {
        method: "POST",
        body: formData,
      });

      const data = (await res.json()) as { fileName?: string; size?: number; error?: string };
      if (!res.ok) {
        setStatusMessage({ text: data.error || "Failed to attach file.", isError: true });
        setIsAttaching(false);
        return;
      }

      const targetProduct = products.find((p) => p.id === selectedProductId);

      setProducts((current) =>
        current.map((item) =>
          item.id === selectedProductId
            ? {
                ...item,
                downloadKey: `products/${selectedProductId}/${data.fileName}`,
                downloadName: data.fileName,
                downloadSize: data.size,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );

      setStatusMessage({
        text: `Attached "${data.fileName}" to ${targetProduct?.name || "product"} successfully.`,
      });
      closeAttach();
    } catch {
      setStatusMessage({ text: "Network error occurred while attaching file.", isError: true });
    } finally {
      setIsAttaching(false);
    }
  }

  return (
    <div className="admin-file-manager">
      <section className="admin-stat-grid admin-stat-grid-4">
        <div className="admin-stat">
          <div className="admin-stat-header">
            <HardDrive size={18} />
          </div>
          <span>Attached files</span>
          <strong>{stats.withFilesCount}</strong>
          <small>Digital files stored</small>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-header">
            <Database size={18} />
          </div>
          <span>Disk storage used</span>
          <strong>{formatBytes(stats.totalBytes) || "0 MB"}</strong>
          <small>Server storage volume</small>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-header">
            <AlertCircle size={18} />
          </div>
          <span>Mods awaiting files</span>
          <strong>{stats.missingFilesCount}</strong>
          <small>Need digital upload</small>
        </div>
        <div className="admin-stat">
          <div className="admin-stat-header">
            <Layers size={18} />
          </div>
          <span>Catalog coverage</span>
          <strong>
            {stats.totalProducts > 0
              ? `${Math.round((stats.withFilesCount / stats.totalProducts) * 100)}%`
              : "0%"}
          </strong>
          <small>Items with files attached</small>
        </div>
      </section>

      {statusMessage && (
        <div
          className={`admin-status-toast ${statusMessage.isError ? "error" : "success"}`}
          role="status"
        >
          {statusMessage.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{statusMessage.text}</span>
          <button type="button" onClick={() => setStatusMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <section className="admin-panel">
        <div className="admin-panel-header">
          <div>
            <span className="admin-kicker">File storage engine</span>
            <h2>Digital Files & Downloads</h2>
          </div>
          <div className="product-panel-actions">
            <Button size="sm" type="button" onClick={() => openAttach()}>
              <Plus size={14} style={{ marginRight: 4 }} />
              Upload & Attach File
            </Button>
          </div>
        </div>

        <div className="admin-catalog-toolbar">
          <div className="admin-catalog-tabs">
            <button
              type="button"
              className={`admin-tab-btn ${filterTab === "stored" ? "active" : ""}`}
              onClick={() => setFilterTab("stored")}
            >
              Stored files <span>({stats.withFilesCount})</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filterTab === "missing" ? "active" : ""}`}
              onClick={() => setFilterTab("missing")}
            >
              Awaiting files <span>({stats.missingFilesCount})</span>
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${filterTab === "all" ? "active" : ""}`}
              onClick={() => setFilterTab("all")}
            >
              All products <span>({stats.totalProducts})</span>
            </button>
          </div>

          <div className="admin-catalog-search">
            <Search size={14} className="admin-search-icon" />
            <input
              type="search"
              placeholder="Search by file name, product, or ID..."
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
                : "No files match your current search or filter."}
            </p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>File Name & Size</th>
                  <th>Associated Product</th>
                  <th>Type & Price</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const hasFile = Boolean(product.downloadKey && product.downloadName);
                  return (
                    <tr key={product.id}>
                      <td data-label="File Name & Size">
                        <div className="admin-file-entry">
                          <div
                            className={`admin-file-icon-box ${hasFile ? "has-file" : "no-file"}`}
                          >
                            <FileText size={18} />
                          </div>
                          <div className="admin-file-text">
                            {hasFile ? (
                              <>
                                <strong>{product.downloadName}</strong>
                                <small>
                                  {product.downloadSize
                                    ? formatBytes(product.downloadSize)
                                    : "Size unknown"}
                                </small>
                              </>
                            ) : (
                              <>
                                <span className="admin-file-empty-label">No file attached</span>
                                <small>Customers cannot download after purchase</small>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      <td data-label="Associated Product">
                        <div className="admin-cell-main">
                          <Link
                            className="admin-order-link"
                            href={`/products/${product.id}`}
                            target="_blank"
                            title="View public product page"
                          >
                            {product.name} <ArrowUpRight size={11} />
                          </Link>
                          <small>ID: {product.id}</small>
                        </div>
                      </td>

                      <td data-label="Type & Price">
                        <div className="admin-cell-main">
                          <span className="admin-kicker" style={{ fontSize: 10, margin: 0 }}>
                            {product.type.toUpperCase()}
                          </span>
                          <strong>Rs. {product.price.toLocaleString("en-LK")}</strong>
                        </div>
                      </td>

                      <td data-label="Status">
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span
                            className={`admin-status ${product.active ? "active" : "cancelled"}`}
                            style={{ alignSelf: "flex-start" }}
                          >
                            {product.active ? "Live" : "Draft"}
                          </span>
                          {hasFile ? (
                            <span className="admin-file-pill ready">Digital Delivery Ready</span>
                          ) : product.type === "mod" ? (
                            <span className="admin-file-pill needed">File Required</span>
                          ) : (
                            <span className="admin-file-pill optional">Optional</span>
                          )}
                        </div>
                      </td>

                      <td data-label="Last Updated">
                        <small>
                          {product.updatedAt
                            ? new Date(product.updatedAt).toLocaleDateString("en-LK", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                        </small>
                      </td>

                      <td data-label="Actions" style={{ textAlign: "right" }}>
                        <div className="admin-file-actions-row">
                          {hasFile ? (
                            <>
                              <a
                                href={`/api/admin/products/${product.id}/file`}
                                className="admin-action-link"
                                download={product.downloadName}
                                title="Download and inspect file"
                              >
                                <Download size={13} />
                                Test
                              </a>
                              <button
                                type="button"
                                className="admin-action-link edit"
                                onClick={() => openEdit(product)}
                                title="Edit file name or replace file"
                              >
                                <Pencil size={13} />
                                Edit
                              </button>
                              <button
                                type="button"
                                className="admin-action-link danger"
                                onClick={() => setProductToDelete(product)}
                                title="Remove file from server"
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="admin-action-link edit"
                              onClick={() => openAttach(product.id)}
                              title="Attach digital file now"
                            >
                              <Plus size={13} />
                              Attach File
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editingProduct && (
        <div
          className="file-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Stored File"
        >
          <div className="file-modal-container">
            <div className="file-modal-header">
              <div>
                <span className="admin-kicker">Digital Storage</span>
                <h2>Edit Stored File: {editingProduct.name}</h2>
              </div>
              <button
                className="file-modal-close"
                type="button"
                onClick={closeEdit}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form className="file-modal-form" onSubmit={handleSaveEdit}>
              <div className="file-modal-body">
                <div className="file-modal-section">
                  <span className="file-modal-section-title">Linked Catalog Product</span>
                  <div className="file-product-preview-card">
                    <div className="file-product-preview-left">
                      <span className="file-product-badge">{editingProduct.type}</span>
                      <div>
                        <strong style={{ display: "block", fontSize: 14 }}>{editingProduct.name}</strong>
                        <small style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
                          Product ID: {editingProduct.id} • Rs. {editingProduct.price.toLocaleString("en-LK")}
                        </small>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="file-modal-section">
                  <label className="file-modal-section-title" htmlFor="edit-display-name">
                    Display File Name *
                  </label>
                  <Input
                    id="edit-display-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. promod_custom_v2.zip"
                    required
                  />
                  <small style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
                    This is the file name shown to clients when downloading.
                  </small>
                </div>

                <div className="file-modal-section">
                  <span className="file-modal-section-title">Stored Digital File</span>
                  {editingProduct.downloadName && !editFile && (
                    <div className="admin-attached-file-card">
                      <div className="admin-attached-file-info">
                        <FileText size={18} className="admin-attached-file-icon" />
                        <div>
                          <strong>{editingProduct.downloadName}</strong>
                          <small>
                            {editingProduct.downloadSize
                              ? formatBytes(editingProduct.downloadSize)
                              : "Current stored file"}
                          </small>
                        </div>
                      </div>
                      <a
                        href={`/api/admin/products/${editingProduct.id}/file`}
                        className="admin-file-action-btn test"
                        download={editingProduct.downloadName}
                      >
                        <Download size={12} /> Test Download
                      </a>
                    </div>
                  )}

                  {editFile ? (
                    <div className="file-selected-card">
                      <div className="file-selected-left">
                        <div className="file-selected-icon-wrap">
                          <UploadCloud size={24} />
                        </div>
                        <div className="file-selected-info">
                          <strong>{editFile.name}</strong>
                          <small>{formatBytes(editFile.size)} • Will overwrite upon save</small>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="admin-file-action-btn danger"
                        onClick={() => setEditFile(null)}
                      >
                        <X size={12} /> Cancel replacement
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`file-dropzone-large ${isEditDragging ? "dragging" : ""}`}
                      style={{ minHeight: 160, padding: "28px 20px" }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsEditDragging(true);
                      }}
                      onDragLeave={() => setIsEditDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsEditDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          setEditFile(file);
                          if (!editName) setEditName(file.name);
                        }
                      }}
                    >
                      <input
                        type="file"
                        accept=".zip,.rar,.7z,.tar,.gz,.bin,.json,.cfg,.txt"
                        style={{ display: "none" }}
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setEditFile(file);
                          if (file && !editName) {
                            setEditName(file.name);
                          }
                          event.target.value = "";
                        }}
                      />
                      <div className="file-dropzone-icon-wrap" style={{ height: 48, width: 48 }}>
                        <UploadCloud size={22} />
                      </div>
                      <div className="file-dropzone-title" style={{ fontSize: 14 }}>
                        {editFile ? "Choose Different File" : "Select or Drop Replacement File (Optional)"}
                      </div>
                      <span className="file-dropzone-formats">
                        Supports ZIP, RAR, 7Z, CFG up to 500 MB
                      </span>
                    </label>
                  )}
                </div>
              </div>

              <div className="file-modal-actions">
                <Button variant="outline" type="button" onClick={closeEdit} disabled={isSavingEdit}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAttachOpen && (
        <div
          className="file-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Upload and Attach Digital File"
        >
          <div className="file-modal-container">
            <div className="file-modal-header">
              <div>
                <span className="admin-kicker">Digital Storage</span>
                <h2>Upload & Attach Digital File</h2>
              </div>
              <button
                className="file-modal-close"
                type="button"
                onClick={closeAttach}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form className="file-modal-form" onSubmit={handleAttachSubmit}>
              <div className="file-modal-body">
                <div className="file-modal-section">
                  <label className="file-modal-section-title" htmlFor="target-catalog-product">
                    Target Catalog Product *
                  </label>
                  <select
                    id="target-catalog-product"
                    className="file-modal-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                  >
                    <option value="">Select digital item...</option>
                    {eligibleProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type.toUpperCase()}) {p.downloadKey ? "• [File Attached]" : "• [No File]"}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
                    Selected product will grant authorized 1-click downloads to verified paid customers.
                  </small>

                  {targetSelectedProduct && (
                    <div className="file-product-preview-card">
                      <div className="file-product-preview-left">
                        <span className="file-product-badge">{targetSelectedProduct.type}</span>
                        <div>
                          <strong style={{ display: "block", fontSize: 14 }}>{targetSelectedProduct.name}</strong>
                          <small style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
                            Price: Rs. {targetSelectedProduct.price.toLocaleString("en-LK")} • {targetSelectedProduct.downloadKey ? `Current: ${targetSelectedProduct.downloadName || "file"} (${formatBytes(targetSelectedProduct.downloadSize)})` : "No file attached"}
                          </small>
                        </div>
                      </div>
                      {targetSelectedProduct.downloadKey && (
                        <span style={{ fontSize: 11, color: "#b45309", background: "#fef3c7", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
                          Will Replace
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="file-modal-section">
                  <span className="file-modal-section-title">Digital File *</span>

                  {attachFile ? (
                    <div className="file-selected-card">
                      <div className="file-selected-left">
                        <div className="file-selected-icon-wrap">
                          <UploadCloud size={24} />
                        </div>
                        <div className="file-selected-info">
                          <strong>{attachFile.name}</strong>
                          <small>{formatBytes(attachFile.size)} • Ready to upload & attach</small>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <label style={{ cursor: "pointer", margin: 0 }}>
                          <input
                            type="file"
                            accept=".zip,.rar,.7z,.tar,.gz,.bin,.json,.cfg,.txt"
                            style={{ display: "none" }}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) setAttachFile(file);
                              event.target.value = "";
                            }}
                          />
                          <span className="admin-file-action-btn edit" style={{ display: "inline-flex", cursor: "pointer" }}>
                            Change
                          </span>
                        </label>
                        <button
                          type="button"
                          className="admin-file-action-btn danger"
                          onClick={() => setAttachFile(null)}
                        >
                          <X size={12} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      className={`file-dropzone-large ${isDragging ? "dragging" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) setAttachFile(file);
                      }}
                    >
                      <input
                        type="file"
                        accept=".zip,.rar,.7z,.tar,.gz,.bin,.json,.cfg,.txt"
                        style={{ display: "none" }}
                        onChange={(event) => {
                          setAttachFile(event.target.files?.[0] ?? null);
                          event.target.value = "";
                        }}
                      />
                      <div className="file-dropzone-icon-wrap">
                        <UploadCloud size={28} />
                      </div>
                      <div className="file-dropzone-title">
                        Choose Digital File or Drag & Drop Here
                      </div>
                      <div className="file-dropzone-desc">
                        Browse and upload game mod files, plugins, tools, or configuration packages.
                      </div>
                      <span className="file-dropzone-formats">
                        ZIP, RAR, 7Z, TAR, GZ, CFG, JSON, BIN, TXT • Max 500 MB
                      </span>
                    </label>
                  )}
                  <small style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
                    Files are stored securely outside public web access. Only authorized buyers can download.
                  </small>
                </div>
              </div>

              <div className="file-modal-actions">
                <Button variant="outline" type="button" onClick={closeAttach} disabled={isAttaching}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isAttaching || !attachFile || !selectedProductId}>
                  {isAttaching ? "Uploading..." : "Upload & Attach"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Delete Stored File"
        description={
          <div>
            <p>
              Are you sure you want to permanently delete the attached file{" "}
              <strong>&quot;{productToDelete?.downloadName}&quot;</strong> for{" "}
              <strong>&quot;{productToDelete?.name}&quot;</strong>?
            </p>
            <p style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              The file will be wiped from disk storage and buyers will no longer be able to
              download it until a new file is uploaded.
            </p>
          </div>
        }
        confirmText="Delete file"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
