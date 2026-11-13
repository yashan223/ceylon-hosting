"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Download,
  Printer,
  RotateCcw,
  Save,
  Check,
  FileText,
  Clock,
} from "lucide-react";
import type { Product } from "@/types/product";
import type { StoreSettings } from "@/server/settings/settings";
import {
  generateInvoicePdf,
  calculateInvoiceTotals,
  type InvoiceData,
  type InvoiceItem,
  type InvoiceStatus,
} from "@/lib/generate-invoice-pdf";

type InvoiceGeneratorProps = {
  products: Product[];
  storeSettings: StoreSettings;
};

const STORAGE_KEY = "ceylonhosting_saved_invoices_v1";

function generateInvoiceNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CH-${year}${month}-${random}`;
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function getDueDateString(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function InvoiceGenerator({ products, storeSettings }: InvoiceGeneratorProps) {
  const [invoice, setInvoice] = useState<InvoiceData>(() => ({
    id: `inv-${Date.now()}`,
    invoiceNumber: generateInvoiceNumber(),
    issueDate: getTodayString(),
    dueDate: getDueDateString(7),
    status: "PAID",
    paymentMethod: "Bank Transfer",
    currency: "LKR",
    currencySymbol: "Rs.",

    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",

    companyName: "CeylonHosting Technologies",
    companyAddress: "Colombo, Sri Lanka",
    companyEmail: "admin@ceylonhosting.tech",
    companyPhone: storeSettings?.whatsappNumber || "+94 78 890 1407",
    companyWebsite: "https://ceylonhosting.tech",

    items: [
      {
        id: "item-1",
        name: "COD4 Singapore Dedicated Server",
        description: "16 Slots, PML220 mod, SS-Site, 24/7 low-ping host (1 Month)",
        quantity: 1,
        unitPrice: 1800,
      },
    ],

    discountValue: 0,
    discountType: "fixed",
    taxRate: 0,

    bankName: "Commercial Bank of Ceylon",
    accountName: "CeylonHosting",
    accountNumber: "800123456789",
    branch: "Colombo Branch",
    paymentNote: `Send payment slip via WhatsApp: ${storeSettings?.whatsappNumber || "+94 78 890 1407"}`,

    notes: "Thank you for choosing CeylonHosting! All servers are provisioned according to service terms.",
    terms: "Payment is due within 7 days of invoice issue date.",
  }));

  const [savedInvoices, setSavedInvoices] = useState<InvoiceData[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as InvoiceData[];
        if (Array.isArray(parsed)) {
          setSavedInvoices(parsed);
        }
      }
    } catch (err) {
      console.warn("Failed to load saved invoices:", err);
    }
  }, []);

  function updateInvoice<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    setInvoice((prev) => ({ ...prev, [key]: value }));
  }

  function handleAddItem() {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      name: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
    };
    updateInvoice("items", [...invoice.items, newItem]);
  }

  function handleRemoveItem(id: string) {
    if (invoice.items.length <= 1) {
      updateInvoice("items", [
        {
          id: `item-${Date.now()}`,
          name: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
        },
      ]);
      return;
    }
    updateInvoice(
      "items",
      invoice.items.filter((item) => item.id !== id),
    );
  }

  function handleItemChange<K extends keyof InvoiceItem>(id: string, field: K, val: InvoiceItem[K]) {
    updateInvoice(
      "items",
      invoice.items.map((item) => (item.id === id ? { ...item, [field]: val } : item)),
    );
  }

  function handleAddFromCatalog(productId: string) {
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const specs = [
      product.type === "server" ? "Dedicated Server" : product.type === "mod" ? "Mod pack" : "Service",
      product.location ? `Location: ${product.location}` : null,
      product.meta || null,
    ]
      .filter(Boolean)
      .join(" • ");

    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      name: product.name,
      description: specs,
      quantity: 1,
      unitPrice: product.price,
    };

    updateInvoice("items", [...invoice.items, newItem]);
  }

  function handleNewInvoice() {
    setInvoice({
      id: `inv-${Date.now()}`,
      invoiceNumber: generateInvoiceNumber(),
      issueDate: getTodayString(),
      dueDate: getDueDateString(7),
      status: "PAID",
      paymentMethod: "Bank Transfer",
      currency: "LKR",
      currencySymbol: "Rs.",

      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientAddress: "",

      companyName: "CeylonHosting Technologies",
      companyAddress: "Colombo, Sri Lanka",
      companyEmail: "admin@ceylonhosting.tech",
      companyPhone: storeSettings?.whatsappNumber || "+94 78 890 1407",
      companyWebsite: "https://ceylonhosting.tech",

      items: [
        {
          id: `item-${Date.now()}`,
          name: "",
          description: "",
          quantity: 1,
          unitPrice: 0,
        },
      ],

      discountValue: 0,
      discountType: "fixed",
      taxRate: 0,

      bankName: "Commercial Bank of Ceylon",
      accountName: "CeylonHosting",
      accountNumber: "800123456789",
      branch: "Colombo Branch",
      paymentNote: `Send payment slip via WhatsApp: ${storeSettings?.whatsappNumber || "+94 78 890 1407"}`,

      notes: "Thank you for choosing CeylonHosting! All servers are provisioned according to service terms.",
      terms: "Payment is due within 7 days of invoice issue date.",
    });
  }

  function handleSaveInvoice() {
    try {
      const now = new Date().toISOString();
      const updatedList = [
        { ...invoice, updatedAt: now },
        ...savedInvoices.filter((inv) => inv.invoiceNumber !== invoice.invoiceNumber),
      ].slice(0, 50);

      setSavedInvoices(updatedList);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.warn("Failed to save invoice:", err);
    }
  }

  function handleLoadInvoice(saved: InvoiceData) {
    setInvoice(saved);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDeleteSavedInvoice(invoiceNumber: string) {
    const updated = savedInvoices.filter((inv) => inv.invoiceNumber !== invoiceNumber);
    setSavedInvoices(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  function handleDownloadPdf() {
    setIsDownloading(true);
    try {
      const doc = generateInvoicePdf(invoice);
      const cleanNum = invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
      doc.save(`Invoice_${cleanNum}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again or use the Print button.");
    } finally {
      setIsDownloading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const { subtotal, discountAmount, taxAmount, grandTotal } = calculateInvoiceTotals(invoice);
  const symbol = invoice.currencySymbol || "Rs.";

  return (
    <div className="admin-invoices-page">
      {/* Top Controls Header */}
      <div className="admin-page-header no-print">
        <div>
          <span className="admin-kicker">Administration</span>
          <h1 className="admin-page-title">Custom Bill Generator</h1>
          <p className="admin-page-subtitle">
            Create simple, clean black-and-white invoices with CeylonHosting branding and export as PDF.
          </p>
        </div>
        <div className="admin-invoice-top-actions">
          <button type="button" className="admin-btn admin-btn-outline" onClick={handleNewInvoice}>
            <RotateCcw size={14} /> New Bill
          </button>
          <button type="button" className="admin-btn admin-btn-outline" onClick={handleSaveInvoice}>
            {saveSuccess ? <Check size={14} /> : <Save size={14} />}
            {saveSuccess ? "Saved" : "Save"}
          </button>
          <button type="button" className="admin-btn admin-btn-outline" onClick={handlePrint}>
            <Printer size={14} /> Print
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-primary"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
          >
            <Download size={14} /> {isDownloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace */}
      <div className="admin-invoice-workspace">
        {/* LEFT COLUMN: Input Fields */}
        <div className="admin-invoice-editor-col no-print">
          {/* Section 1: Bill Meta */}
          <section className="admin-panel admin-invoice-section">
            <div className="admin-panel-header">
              <h3 className="admin-simple-title">Invoice Settings</h3>
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => updateInvoice("invoiceNumber", generateInvoiceNumber())}
              >
                Generate #
              </button>
            </div>

            <div className="admin-form-grid-2">
              <div className="admin-field">
                <label>Invoice Number</label>
                <input
                  type="text"
                  value={invoice.invoiceNumber}
                  onChange={(e) => updateInvoice("invoiceNumber", e.target.value)}
                  placeholder="CH-2026-0042"
                />
              </div>

              <div className="admin-field">
                <label>Status</label>
                <select
                  value={invoice.status}
                  onChange={(e) => updateInvoice("status", e.target.value as InvoiceStatus)}
                >
                  <option value="PAID">PAID</option>
                  <option value="PENDING">PENDING</option>
                  <option value="DUE">DUE</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="admin-field">
                <label>Issue Date</label>
                <input
                  type="date"
                  value={invoice.issueDate}
                  onChange={(e) => updateInvoice("issueDate", e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label>Due Date</label>
                <input
                  type="date"
                  value={invoice.dueDate}
                  onChange={(e) => updateInvoice("dueDate", e.target.value)}
                />
              </div>

              <div className="admin-field">
                <label>Payment Method</label>
                <input
                  type="text"
                  value={invoice.paymentMethod}
                  onChange={(e) => updateInvoice("paymentMethod", e.target.value)}
                  placeholder="Bank Transfer, Cash, Online"
                />
              </div>

              <div className="admin-field">
                <label>Currency</label>
                <select
                  value={`${invoice.currency}|${invoice.currencySymbol}`}
                  onChange={(e) => {
                    const [c, s] = e.target.value.split("|");
                    updateInvoice("currency", c);
                    updateInvoice("currencySymbol", s);
                  }}
                >
                  <option value="LKR|Rs.">LKR (Rs.)</option>
                  <option value="USD|$">USD ($)</option>
                  <option value="EUR|€">EUR (€)</option>
                  <option value="GBP|£">GBP (£)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Section 2: Customer Info */}
          <section className="admin-panel admin-invoice-section">
            <div className="admin-panel-header">
              <h3 className="admin-simple-title">Billed To (Customer Details)</h3>
            </div>

            <div className="admin-form-grid-2">
              <div className="admin-field admin-field-span-2">
                <label>Customer Name / Clan *</label>
                <input
                  type="text"
                  value={invoice.clientName}
                  onChange={(e) => updateInvoice("clientName", e.target.value)}
                  placeholder="John Doe / Ghost Clan"
                  required
                />
              </div>

              <div className="admin-field">
                <label>Email</label>
                <input
                  type="email"
                  value={invoice.clientEmail || ""}
                  onChange={(e) => updateInvoice("clientEmail", e.target.value)}
                  placeholder="client@example.com"
                />
              </div>

              <div className="admin-field">
                <label>WhatsApp / Phone</label>
                <input
                  type="text"
                  value={invoice.clientPhone || ""}
                  onChange={(e) => updateInvoice("clientPhone", e.target.value)}
                  placeholder="+94 77 123 4567"
                />
              </div>

              <div className="admin-field admin-field-span-2">
                <label>Address / Country</label>
                <input
                  type="text"
                  value={invoice.clientAddress || ""}
                  onChange={(e) => updateInvoice("clientAddress", e.target.value)}
                  placeholder="Colombo, Sri Lanka"
                />
              </div>
            </div>
          </section>

          {/* Section 3: Line Items */}
          <section className="admin-panel admin-invoice-section">
            <div className="admin-panel-header">
              <h3 className="admin-simple-title">Items & Prices</h3>
              {products.length > 0 && (
                <div className="admin-catalog-quick-add">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      handleAddFromCatalog(e.target.value);
                      e.target.value = "";
                    }}
                  >
                    <option value="" disabled>
                      + Add from catalog...
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Rs. {p.price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="admin-invoice-items-table">
              {invoice.items.map((item, index) => {
                const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                return (
                  <div key={item.id} className="admin-invoice-item-row">
                    <span className="admin-invoice-item-num">{index + 1}.</span>

                    <div className="admin-invoice-item-fields">
                      <div className="admin-field-row">
                        <input
                          type="text"
                          className="admin-item-title-input"
                          value={item.name}
                          onChange={(e) => handleItemChange(item.id, "name", e.target.value)}
                          placeholder="Item name / service"
                        />
                      </div>

                      <div className="admin-field-row">
                        <input
                          type="text"
                          className="admin-item-desc-input"
                          value={item.description || ""}
                          onChange={(e) => handleItemChange(item.id, "description", e.target.value)}
                          placeholder="Description / specifications (optional)"
                        />
                      </div>

                      <div className="admin-invoice-item-numbers">
                        <div className="admin-inline-field">
                          <label>Qty:</label>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                            }
                          />
                        </div>

                        <div className="admin-inline-field">
                          <label>Price ({symbol}):</label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) =>
                              handleItemChange(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                            }
                          />
                        </div>

                        <div className="admin-inline-total">
                          <span>Total:</span>
                          <strong>
                            {symbol} {lineTotal.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="admin-item-del-btn"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Delete item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}

              <button type="button" className="admin-add-item-btn" onClick={handleAddItem}>
                <Plus size={14} /> Add Line Item
              </button>
            </div>

            {/* Calculations & Discounts */}
            <div className="admin-invoice-adjustments">
              <div className="admin-adj-col">
                <label>Discount</label>
                <div className="admin-input-group">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={invoice.discountValue}
                    onChange={(e) => updateInvoice("discountValue", parseFloat(e.target.value) || 0)}
                  />
                  <select
                    value={invoice.discountType}
                    onChange={(e) => updateInvoice("discountType", e.target.value as "fixed" | "percent")}
                  >
                    <option value="fixed">{symbol}</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </div>

              <div className="admin-adj-col">
                <label>Tax (%)</label>
                <div className="admin-input-group">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={invoice.taxRate}
                    onChange={(e) => updateInvoice("taxRate", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <span className="admin-input-suffix">%</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Bank Details */}
          <section className="admin-panel admin-invoice-section">
            <div className="admin-panel-header">
              <h3 className="admin-simple-title">Payment & Bank Details</h3>
            </div>

            <div className="admin-form-grid-2">
              <div className="admin-field">
                <label>Bank Name</label>
                <input
                  type="text"
                  value={invoice.bankName}
                  onChange={(e) => updateInvoice("bankName", e.target.value)}
                  placeholder="Commercial Bank of Ceylon"
                />
              </div>

              <div className="admin-field">
                <label>Account Name</label>
                <input
                  type="text"
                  value={invoice.accountName}
                  onChange={(e) => updateInvoice("accountName", e.target.value)}
                  placeholder="CeylonHosting"
                />
              </div>

              <div className="admin-field">
                <label>Account Number</label>
                <input
                  type="text"
                  value={invoice.accountNumber}
                  onChange={(e) => updateInvoice("accountNumber", e.target.value)}
                  placeholder="800123456789"
                />
              </div>

              <div className="admin-field">
                <label>Branch</label>
                <input
                  type="text"
                  value={invoice.branch}
                  onChange={(e) => updateInvoice("branch", e.target.value)}
                  placeholder="Colombo Branch"
                />
              </div>

              <div className="admin-field admin-field-span-2">
                <label>Payment Reference / Receipt Instructions</label>
                <input
                  type="text"
                  value={invoice.paymentNote || ""}
                  onChange={(e) => updateInvoice("paymentNote", e.target.value)}
                  placeholder="Send receipt screenshot to WhatsApp..."
                />
              </div>
            </div>
          </section>

          {/* Section 5: Notes */}
          <section className="admin-panel admin-invoice-section">
            <div className="admin-panel-header">
              <h3 className="admin-simple-title">Notes & Terms</h3>
            </div>

            <div className="admin-field">
              <label>Customer Note</label>
              <textarea
                rows={2}
                value={invoice.notes || ""}
                onChange={(e) => updateInvoice("notes", e.target.value)}
                placeholder="Thank you for choosing CeylonHosting..."
              />
            </div>

            <div className="admin-field" style={{ marginTop: 12 }}>
              <label>Terms</label>
              <textarea
                rows={2}
                value={invoice.terms || ""}
                onChange={(e) => updateInvoice("terms", e.target.value)}
                placeholder="Payment terms..."
              />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Minimalist Black & White Document Preview */}
        <div className="admin-invoice-preview-col">
          <div className="admin-preview-sticky">
            <div className="admin-preview-header no-print">
              <div className="admin-preview-title">
                <FileText size={15} />
                <span>Document Preview</span>
              </div>
              <div className="admin-preview-actions">
                <button type="button" className="admin-preview-btn print" onClick={handlePrint}>
                  <Printer size={14} /> Print
                </button>
                <button
                  type="button"
                  className="admin-preview-btn download"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                >
                  <Download size={14} /> {isDownloading ? "Generating..." : "Download PDF"}
                </button>
              </div>
            </div>

            {/* PURE BLACK AND WHITE A4 PAPER PREVIEW */}
            <div className="invoice-printable-wrapper">
              <div className="invoice-paper bw-mode" id="invoice-paper">
                {/* Header: Logo & Invoice Title */}
                <div className="invoice-paper-header">
                  <div className="invoice-paper-brand">
                    <Image
                      src="/logo.png"
                      alt="CeylonHosting"
                      width={170}
                      height={22}
                      className="invoice-paper-logo"
                      priority
                    />
                    <div className="invoice-paper-company-info">
                      <p className="company-name">{invoice.companyName || "CeylonHosting Technologies"}</p>
                      <p className="company-meta">
                        {invoice.companyAddress || "Sri Lanka"} • {invoice.companyWebsite || "ceylonhosting.tech"}
                      </p>
                      <p className="company-contact">
                        WhatsApp: {invoice.companyPhone || "+94 78 890 1407"} | {invoice.companyEmail || "admin@ceylonhosting.tech"}
                      </p>
                    </div>
                  </div>

                  <div className="invoice-paper-meta-right">
                    <h2 className="invoice-paper-title">INVOICE</h2>
                    <span className="invoice-bw-status-tag">STATUS: {invoice.status}</span>

                    <div className="invoice-paper-meta-list">
                      <div className="meta-row">
                        <span>Invoice #:</span>
                        <strong>{invoice.invoiceNumber}</strong>
                      </div>
                      <div className="meta-row">
                        <span>Issue Date:</span>
                        <strong>{invoice.issueDate || "Today"}</strong>
                      </div>
                      {invoice.dueDate && (
                        <div className="meta-row">
                          <span>Due Date:</span>
                          <strong>{invoice.dueDate}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="invoice-bw-divider" />

                {/* Billed To & Payment Overview (Simple Clean Black & White) */}
                <div className="invoice-bw-info-grid">
                  <div className="invoice-bw-info-col">
                    <span className="bw-kicker">BILLED TO:</span>
                    <strong className="bw-client-name">{invoice.clientName || "Valued Customer"}</strong>
                    {invoice.clientEmail && <p className="bw-detail">{invoice.clientEmail}</p>}
                    {invoice.clientPhone && <p className="bw-detail">WhatsApp: {invoice.clientPhone}</p>}
                    {invoice.clientAddress && <p className="bw-detail">{invoice.clientAddress}</p>}
                  </div>

                  <div className="invoice-bw-info-col right">
                    <span className="bw-kicker">PAYMENT DETAILS:</span>
                    <p className="bw-detail">
                      <strong>Method:</strong> {invoice.paymentMethod || "Bank Transfer"}
                    </p>
                    <p className="bw-detail">
                      <strong>Currency:</strong> {invoice.currency || "LKR"}
                    </p>
                  </div>
                </div>

                {/* Items Table (Pure Black & White, No Shading) */}
                <table className="invoice-bw-table">
                  <thead>
                    <tr>
                      <th style={{ width: "30px", textAlign: "left" }}>#</th>
                      <th style={{ textAlign: "left" }}>ITEM & DESCRIPTION</th>
                      <th style={{ width: "45px", textAlign: "center" }}>QTY</th>
                      <th style={{ width: "95px", textAlign: "right" }}>UNIT PRICE</th>
                      <th style={{ width: "105px", textAlign: "right" }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => {
                      const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <tr key={item.id + idx}>
                          <td className="bw-index">{idx + 1}</td>
                          <td className="bw-desc-cell">
                            <strong className="bw-item-name">{item.name || "Custom item"}</strong>
                            {item.description && <p className="bw-item-desc">{item.description}</p>}
                          </td>
                          <td className="bw-qty">{item.quantity}</td>
                          <td className="bw-price">
                            {symbol} {(Number(item.unitPrice) || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="bw-total">
                            {symbol} {rowTotal.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Bank Box (Left) & Totals (Right) */}
                <div className="invoice-bw-bottom-grid">
                  <div className="invoice-bw-bank-box">
                    <span className="bw-kicker">PAYMENT DETAILS (BANK TRANSFER)</span>
                    <p className="bw-bank-line">
                      <strong>Bank:</strong> {invoice.bankName || "Commercial Bank of Ceylon"}
                    </p>
                    <p className="bw-bank-line">
                      <strong>Account Name:</strong> {invoice.accountName || "CeylonHosting"}
                    </p>
                    <p className="bw-bank-line">
                      <strong>Account Number:</strong> {invoice.accountNumber || "800123456789"}
                    </p>
                    <p className="bw-bank-line">
                      <strong>Branch:</strong> {invoice.branch || "Colombo"} • <strong>Ref:</strong>{" "}
                      {invoice.invoiceNumber}
                    </p>
                    {invoice.paymentNote && <p className="bw-bank-note">{invoice.paymentNote}</p>}
                  </div>

                  <div className="invoice-bw-totals-box">
                    <div className="bw-totals-row">
                      <span>Subtotal:</span>
                      <strong>
                        {symbol} {subtotal.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                      </strong>
                    </div>

                    {discountAmount > 0 && (
                      <div className="bw-totals-row">
                        <span>
                          Discount {invoice.discountType === "percent" ? `(${invoice.discountValue}%)` : ""}:
                        </span>
                        <strong>
                          - {symbol} {discountAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    )}

                    {taxAmount > 0 && (
                      <div className="bw-totals-row">
                        <span>Tax ({invoice.taxRate}%):</span>
                        <strong>
                          + {symbol} {taxAmount.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                        </strong>
                      </div>
                    )}

                    <div className="bw-grand-total-box">
                      <span>TOTAL DUE:</span>
                      <strong className="bw-grand-val">
                        {symbol}{" "}
                        {grandTotal.toLocaleString("en-LK", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Notes & Terms */}
                {(invoice.notes || invoice.terms) && (
                  <div className="invoice-bw-notes-block">
                    {invoice.notes && <p><strong>Note:</strong> {invoice.notes}</p>}
                    {invoice.terms && <p><strong>Terms:</strong> {invoice.terms}</p>}
                  </div>
                )}

                {/* Footer */}
                <div className="invoice-bw-footer">
                  <p>
                    Thank you for your business. • {invoice.companyWebsite || "https://ceylonhosting.tech"} • WhatsApp:{" "}
                    {invoice.companyPhone || "+94 78 890 1407"}
                  </p>
                  <span>CeylonHosting Billing System</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAVED INVOICES HISTORY */}
      {savedInvoices.length > 0 && (
        <section className="admin-panel admin-saved-invoices-panel no-print" style={{ marginTop: 28 }}>
          <div className="admin-panel-header">
            <h3 className="admin-simple-title">Saved Bills ({savedInvoices.length})</h3>
          </div>

          <div className="admin-saved-invoices-table-wrap">
            <table className="admin-saved-invoices-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {savedInvoices.map((saved) => {
                  const totals = calculateInvoiceTotals(saved);
                  return (
                    <tr key={saved.invoiceNumber}>
                      <td>
                        <strong>{saved.invoiceNumber}</strong>
                      </td>
                      <td>
                        <strong>{saved.clientName || "Valued Customer"}</strong>
                      </td>
                      <td>{saved.issueDate}</td>
                      <td>{saved.items?.length || 0}</td>
                      <td>
                        <strong>
                          {saved.currencySymbol || "Rs."}{" "}
                          {totals.grandTotal.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td>
                        <span className="admin-bw-tag">{saved.status}</span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div className="admin-saved-actions">
                          <button
                            type="button"
                            className="admin-sm-action-btn"
                            onClick={() => handleLoadInvoice(saved)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-sm-action-btn"
                            onClick={() => {
                              const doc = generateInvoicePdf(saved);
                              doc.save(`Invoice_${saved.invoiceNumber}.pdf`);
                            }}
                          >
                            <Download size={12} /> PDF
                          </button>
                          <button
                            type="button"
                            className="admin-sm-action-btn delete"
                            onClick={() => handleDeleteSavedInvoice(saved.invoiceNumber)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
