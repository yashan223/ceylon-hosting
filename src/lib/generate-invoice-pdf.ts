import { jsPDF } from "jspdf";
import { CEYLONHOSTING_LOGO_BASE64 } from "./invoice-logo";

export type InvoiceItem = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceStatus = "PAID" | "PENDING" | "UNPAID" | "DUE" | "CANCELLED";

export type InvoiceData = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  paymentMethod?: string;
  currency: string;
  currencySymbol: string;

  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;

  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string;

  items: InvoiceItem[];

  discountValue: number;
  discountType: "fixed" | "percent";
  taxRate: number;

  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  branch?: string;
  paymentNote?: string;

  notes?: string;
  terms?: string;

  createdAt?: string;
  updatedAt?: string;
};

export function calculateInvoiceTotals(invoice: InvoiceData) {
  const subtotal = (invoice.items || []).reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0,
  );

  const discountAmount =
    invoice.discountType === "percent"
      ? (subtotal * (Number(invoice.discountValue) || 0)) / 100
      : Number(invoice.discountValue) || 0;

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = (taxableAmount * (Number(invoice.taxRate) || 0)) / 100;
  const grandTotal = Math.max(0, taxableAmount + taxAmount);

  return {
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
  };
}

function formatAmount(amount: number, symbol = "Rs.") {
  return `${symbol} ${amount.toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateInvoicePdf(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 15;
  const contentWidth = pageWidth - margin * 2; // 180mm

  const { subtotal, discountAmount, taxAmount, grandTotal } = calculateInvoiceTotals(invoice);
  const symbol = invoice.currencySymbol || "Rs.";

  // 1. CeylonHosting Logo (Top Left)
  // Aspect ratio is 1864:244 = ~7.64:1
  const logoWidth = 46;
  const logoHeight = logoWidth / 7.64; // ~6.0mm
  try {
    doc.addImage(CEYLONHOSTING_LOGO_BASE64, "PNG", margin, 14, logoWidth, logoHeight);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(invoice.companyName || "CEYLONHOSTING", margin, 19);
  }

  // Company details under logo (clean black / dark gray text)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text(invoice.companyName || "CeylonHosting Technologies", margin, 25);
  doc.text(
    `${invoice.companyAddress || "Sri Lanka"}  •  ${invoice.companyWebsite || "ceylonhosting.tech"}`,
    margin,
    29,
  );
  doc.text(
    `Email: ${invoice.companyEmail || "ceylonhosting@proton.me"}  |  WhatsApp: ${invoice.companyPhone || "+94 78 890 1407"}`,
    margin,
    33,
  );

  // 2. Invoice Title & Details on the Right (Pure Black & White)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text("INVOICE", pageWidth - margin, 20, { align: "right" });

  // Minimalist Status Box (Simple 1px black outline, no colors)
  const statusText = `STATUS: ${invoice.status || "PENDING"}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  const statusWidth = doc.getTextWidth(statusText) + 6;
  const statusX = pageWidth - margin - statusWidth;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(statusX, 23, statusWidth, 5.5, "S");
  doc.text(statusText, statusX + 3, 27);

  // Metadata block
  let metaY = 33.5;
  const metaLabelX = pageWidth - margin - 35;
  const metaValX = pageWidth - margin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text("Invoice #:", metaLabelX, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.invoiceNumber || "CH-INV-001", metaValX, metaY, { align: "right" });

  metaY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(70, 70, 70);
  doc.text("Issue Date:", metaLabelX, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text(invoice.issueDate || "Today", metaValX, metaY, { align: "right" });

  // 3. Simple Black Horizontal Divider Line
  const lineY = Math.max(46, metaY + 4);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  // 4. Billed To & Payment Overview (Clean Black/White Text Block)
  const infoY = lineY + 6;

  // Left: Billed To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  doc.text("BILLED TO:", margin, infoY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(0, 0, 0);
  const clientName = invoice.clientName || "Valued Customer";
  doc.text(clientName, margin, infoY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  let clientDetailY = infoY + 10;
  if (invoice.clientEmail || invoice.clientPhone) {
    const contactLine = [invoice.clientEmail, invoice.clientPhone].filter(Boolean).join("  •  ");
    doc.text(contactLine, margin, clientDetailY);
    clientDetailY += 4.5;
  }
  if (invoice.clientAddress) {
    doc.text(invoice.clientAddress, margin, clientDetailY);
    clientDetailY += 4.5;
  }

  // 5. Minimalist Table (Pure Black & White)
  let tableY = Math.max(clientDetailY + 4, infoY + 12);

  // Top border line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(margin, tableY, pageWidth - margin, tableY);

  // Header Text
  tableY += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text("#", margin + 2, tableY);
  doc.text("ITEM & DESCRIPTION", margin + 12, tableY);
  doc.text("QTY", margin + 115, tableY, { align: "center" });
  doc.text("UNIT PRICE", margin + 148, tableY, { align: "right" });
  doc.text("TOTAL", pageWidth - margin - 2, tableY, { align: "right" });

  // Bottom line under header
  tableY += 2.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, tableY, pageWidth - margin, tableY);

  // Table Rows (White Background, Black Text, Clean Gray Dividers)
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [];

  items.forEach((item, index) => {
    // Check page break
    if (tableY > pageHeight - 65) {
      doc.addPage();
      tableY = 16;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.6);
      doc.line(margin, tableY, pageWidth - margin, tableY);
      tableY += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text("#", margin + 2, tableY);
      doc.text("ITEM & DESCRIPTION (Cont.)", margin + 12, tableY);
      doc.text("QTY", margin + 115, tableY, { align: "center" });
      doc.text("UNIT PRICE", margin + 148, tableY, { align: "right" });
      doc.text("TOTAL", pageWidth - margin - 2, tableY, { align: "right" });
      tableY += 2.5;
      doc.setLineWidth(0.4);
      doc.line(margin, tableY, pageWidth - margin, tableY);
    }

    const rowHasDesc = Boolean(item.description && item.description.trim());
    const rowHeight = rowHasDesc ? 11.5 : 8;

    tableY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(String(index + 1), margin + 2, tableY);

    // Item Name
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    const itemName = item.name || "Item";
    doc.text(itemName.length > 62 ? itemName.slice(0, 60) + "..." : itemName, margin + 12, tableY);

    // Item Description (Subtitle)
    if (rowHasDesc) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(90, 90, 90);
      const desc = item.description || "";
      doc.text(desc.length > 70 ? desc.slice(0, 68) + "..." : desc, margin + 12, tableY + 4);
    }

    // Qty
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(String(item.quantity || 1), margin + 115, tableY, { align: "center" });

    // Unit Price
    doc.text(formatAmount(Number(item.unitPrice) || 0, symbol), margin + 148, tableY, { align: "right" });

    // Row Total
    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    doc.setFont("helvetica", "bold");
    doc.text(formatAmount(rowTotal, symbol), pageWidth - margin - 2, tableY, { align: "right" });

    tableY += rowHasDesc ? 7 : 3.5;

    // Row divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin, tableY, pageWidth - margin, tableY);
  });

  // Table bottom border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, tableY, pageWidth - margin, tableY);

  tableY += 5;

  // 6. Bottom Section: Totals Breakdown (Right-Aligned)
  if (tableY > pageHeight - 65) {
    doc.addPage();
    tableY = 16;
  }

  const totalsWidth = 76;
  const totalsX = pageWidth - margin - totalsWidth;

  // Totals breakdown (Right, clean black & white)
  let totY = tableY + 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(70, 70, 70);
  doc.text("Subtotal:", totalsX, totY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(formatAmount(subtotal, symbol), pageWidth - margin - 2, totY, { align: "right" });

  if (discountAmount > 0) {
    totY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    const discLabel =
      invoice.discountType === "percent"
        ? `Discount (${invoice.discountValue}%):`
        : "Discount:";
    doc.text(discLabel, totalsX, totY);
    doc.setTextColor(0, 0, 0);
    doc.text(`- ${formatAmount(discountAmount, symbol)}`, pageWidth - margin - 2, totY, { align: "right" });
  }

  if (taxAmount > 0) {
    totY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(70, 70, 70);
    doc.text(`Tax (${invoice.taxRate}%):`, totalsX, totY);
    doc.setTextColor(0, 0, 0);
    doc.text(`+ ${formatAmount(taxAmount, symbol)}`, pageWidth - margin - 2, totY, { align: "right" });
  }

  totY += 4.5;
  // Grand Total Box (Clean solid black border with bold black text)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.rect(totalsX - 2, totY, totalsWidth + 2, 9.5, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text("TOTAL:", totalsX + 2, totY + 6.2);

  doc.setFontSize(10.5);
  doc.text(formatAmount(grandTotal, symbol), pageWidth - margin - 3, totY + 6.2, { align: "right" });

  return doc;
}
