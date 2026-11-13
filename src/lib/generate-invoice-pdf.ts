import { jsPDF } from "jspdf";
import { CEYLONHOSTING_LOGO_BASE64 } from "./invoice-logo";

export type InvoiceItem = {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
};

export type InvoiceStatus = "PAID" | "PENDING" | "DUE" | "CANCELLED";

export type InvoiceData = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentMethod: string;
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

  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
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
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const { subtotal, discountAmount, taxAmount, grandTotal } = calculateInvoiceTotals(invoice);
  const symbol = invoice.currencySymbol || "Rs.";

  // 1. Top Decorative Brand Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 4.5, "F");

  // 2. Logo (CeylonHosting)
  // Aspect ratio is 1864:244 = ~7.64:1
  const logoWidth = 48;
  const logoHeight = logoWidth / 7.64; // ~6.28mm
  try {
    doc.addImage(CEYLONHOSTING_LOGO_BASE64, "PNG", margin, 12, logoWidth, logoHeight);
  } catch {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.companyName || "CEYLONHOSTING", margin, 18);
  }

  // Company details under logo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(invoice.companyName || "CeylonHosting Technologies", margin, 24);
  doc.text(
    `${invoice.companyAddress || "Sri Lanka"}  •  ${invoice.companyWebsite || "ceylonhosting.tech"}`,
    margin,
    28,
  );
  doc.text(
    `Email: ${invoice.companyEmail || "admin@ceylonhosting.tech"}  |  WhatsApp: ${invoice.companyPhone || "+94 78 890 1407"}`,
    margin,
    32,
  );

  // 3. Invoice Header Title & Status Badge (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("INVOICE", pageWidth - margin, 18, { align: "right" });

  // Status Badge
  const statusColors: Record<InvoiceStatus, [number, number, number]> = {
    PAID: [22, 163, 74], // emerald
    PENDING: [217, 119, 6], // amber
    DUE: [37, 99, 235], // blue
    CANCELLED: [100, 116, 139], // slate
  };
  const badgeColor = statusColors[invoice.status] || [100, 116, 139];
  const badgeWidth = 24;
  const badgeHeight = 6;
  const badgeX = pageWidth - margin - badgeWidth;
  const badgeY = 22;

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.status || "DUE", badgeX + badgeWidth / 2, badgeY + 4.2, { align: "center" });

  // Metadata block (Invoice #, Date, Due Date)
  let metaY = 32.5;
  const metaLabelX = pageWidth - margin - 38;
  const metaValX = pageWidth - margin;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Invoice #:", metaLabelX, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.invoiceNumber || "CH-INV-001", metaValX, metaY, { align: "right" });

  metaY += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Issue Date:", metaLabelX, metaY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.issueDate || "Today", metaValX, metaY, { align: "right" });

  if (invoice.dueDate) {
    metaY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text("Due Date:", metaLabelX, metaY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(invoice.dueDate, metaValX, metaY, { align: "right" });
  }

  // 4. Divider Line
  const lineY = Math.max(46, metaY + 4);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.35);
  doc.line(margin, lineY, pageWidth - margin, lineY);

  // 5. Two Cards: "Billed To" and "Payment Overview"
  const cardsY = lineY + 4;
  const cardHeight = 27;
  const cardGap = 8;
  const cardWidth = (contentWidth - cardGap) / 2;

  // Card 1: Billed To
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 1.8, 1.8, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cardsY, cardWidth, cardHeight, 1.8, 1.8, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("BILLED TO", margin + 4, cardsY + 5.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const clientName = invoice.clientName || "Valued Customer";
  doc.text(clientName.length > 32 ? clientName.slice(0, 30) + "..." : clientName, margin + 4, cardsY + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let clientDetailsY = cardsY + 16;
  if (invoice.clientEmail || invoice.clientPhone) {
    const contactLine = [invoice.clientEmail, invoice.clientPhone].filter(Boolean).join("  •  ");
    doc.text(contactLine.length > 42 ? contactLine.slice(0, 40) + "..." : contactLine, margin + 4, clientDetailsY);
    clientDetailsY += 4.5;
  }
  if (invoice.clientAddress) {
    doc.text(
      invoice.clientAddress.length > 42 ? invoice.clientAddress.slice(0, 40) + "..." : invoice.clientAddress,
      margin + 4,
      clientDetailsY,
    );
  }

  // Card 2: Payment Overview
  const card2X = margin + cardWidth + cardGap;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(card2X, cardsY, cardWidth, cardHeight, 1.8, 1.8, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(card2X, cardsY, cardWidth, cardHeight, 1.8, 1.8, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("PAYMENT METHOD & SUMMARY", card2X + 4, cardsY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text("Method:", card2X + 4, cardsY + 11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.paymentMethod || "Bank Transfer", card2X + 22, cardsY + 11);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Currency:", card2X + 4, cardsY + 16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.currency || "LKR", card2X + 22, cardsY + 16);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Total:", card2X + 4, cardsY + 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(22, 163, 74);
  doc.text(formatAmount(grandTotal, symbol), card2X + 22, cardsY + 21);

  // 6. Line Items Table Header
  let tableY = cardsY + cardHeight + 6;

  doc.setFillColor(15, 23, 42); // dark slate header
  doc.roundedRect(margin, tableY, contentWidth, 7.5, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("#", margin + 3.5, tableY + 5);
  doc.text("ITEM & DESCRIPTION", margin + 12, tableY + 5);
  doc.text("QTY", margin + 115, tableY + 5, { align: "center" });
  doc.text("UNIT PRICE", margin + 148, tableY + 5, { align: "right" });
  doc.text("AMOUNT", pageWidth - margin - 3.5, tableY + 5, { align: "right" });

  tableY += 7.5;

  // 7. Line Items Table Rows
  const items = invoice.items && invoice.items.length > 0 ? invoice.items : [];

  items.forEach((item, index) => {
    // Check if we need page break
    if (tableY > pageHeight - 65) {
      doc.addPage();
      tableY = 16;
      // mini header
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(margin, tableY, contentWidth, 7.5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("#", margin + 3.5, tableY + 5);
      doc.text("ITEM & DESCRIPTION (Cont.)", margin + 12, tableY + 5);
      doc.text("QTY", margin + 115, tableY + 5, { align: "center" });
      doc.text("UNIT PRICE", margin + 148, tableY + 5, { align: "right" });
      doc.text("AMOUNT", pageWidth - margin - 3.5, tableY + 5, { align: "right" });
      tableY += 7.5;
    }

    const rowHasDesc = Boolean(item.description && item.description.trim());
    const rowHeight = rowHasDesc ? 12.5 : 8.5;
    const isAlt = index % 2 === 1;

    if (isAlt) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, tableY, contentWidth, rowHeight, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(String(index + 1), margin + 3.5, tableY + 5);

    // Item Name
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    const itemName = item.name || "Item";
    doc.text(itemName.length > 60 ? itemName.slice(0, 58) + "..." : itemName, margin + 12, tableY + 5);

    // Item Description (Subtitle)
    if (rowHasDesc) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const desc = item.description || "";
      doc.text(desc.length > 70 ? desc.slice(0, 68) + "..." : desc, margin + 12, tableY + 9.5);
    }

    // Qty
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.quantity || 1), margin + 115, tableY + 5, { align: "center" });

    // Unit Price
    doc.text(formatAmount(Number(item.unitPrice) || 0, symbol), margin + 148, tableY + 5, { align: "right" });

    // Row Total
    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    doc.setFont("helvetica", "bold");
    doc.text(formatAmount(rowTotal, symbol), pageWidth - margin - 3.5, tableY + 5, { align: "right" });

    // Divider line
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.25);
    doc.line(margin, tableY + rowHeight, pageWidth - margin, tableY + rowHeight);

    tableY += rowHeight;
  });

  tableY += 4;

  // 8. Bottom Section: Bank Instructions (Left) + Totals Breakdown (Right)
  if (tableY > pageHeight - 75) {
    doc.addPage();
    tableY = 16;
  }

  const totalsWidth = 75;
  const totalsX = pageWidth - margin - totalsWidth;
  const notesWidth = contentWidth - totalsWidth - 8;

  // Bank Info Box (Left)
  const bankBoxHeight = 34;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, tableY, notesWidth, bankBoxHeight, 1.8, 1.8, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, tableY, notesWidth, bankBoxHeight, 1.8, 1.8, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("BANK TRANSFER & PAYMENT INSTRUCTIONS", margin + 4, tableY + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Bank: ${invoice.bankName || "Commercial Bank of Ceylon"}`, margin + 4, tableY + 11);
  doc.text(`Account Name: ${invoice.accountName || "CeylonHosting"}`, margin + 4, tableY + 15.5);
  doc.text(`Account Number: ${invoice.accountNumber || "800123456789"}`, margin + 4, tableY + 20);
  doc.text(`Branch: ${invoice.branch || "Colombo"}  |  Ref: ${invoice.invoiceNumber}`, margin + 4, tableY + 24.5);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const payNote = invoice.paymentNote || `Send payment receipt via WhatsApp: ${invoice.companyPhone || "+94 78 890 1407"}`;
  doc.text(payNote.length > 55 ? payNote.slice(0, 53) + "..." : payNote, margin + 4, tableY + 29.5);

  // Totals breakdown (Right)
  let totY = tableY + 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Subtotal:", totalsX, totY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(formatAmount(subtotal, symbol), pageWidth - margin - 3.5, totY, { align: "right" });

  if (discountAmount > 0) {
    totY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    const discLabel =
      invoice.discountType === "percent"
        ? `Discount (${invoice.discountValue}%):`
        : "Discount:";
    doc.text(discLabel, totalsX, totY);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`- ${formatAmount(discountAmount, symbol)}`, pageWidth - margin - 3.5, totY, { align: "right" });
  }

  if (taxAmount > 0) {
    totY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Tax (${invoice.taxRate}%):`, totalsX, totY);
    doc.setTextColor(15, 23, 42);
    doc.text(`+ ${formatAmount(taxAmount, symbol)}`, pageWidth - margin - 3.5, totY, { align: "right" });
  }

  totY += 4.5;
  // Grand Total Highlight Box
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(totalsX - 3, totY, totalsWidth + 3, 10, 1.5, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text("TOTAL DUE:", totalsX, totY + 6.5);

  doc.setFontSize(10.5);
  doc.setTextColor(52, 211, 153); // emerald-400
  doc.text(formatAmount(grandTotal, symbol), pageWidth - margin - 3.5, totY + 6.5, { align: "right" });

  // 9. Notes & Terms
  const notesY = tableY + bankBoxHeight + 5;
  if (invoice.notes || invoice.terms) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    if (invoice.notes) {
      doc.text(`Note: ${invoice.notes}`, margin, notesY);
    }
    if (invoice.terms) {
      doc.text(`Terms: ${invoice.terms}`, margin, notesY + 4.5);
    }
  }

  // 10. Footer (Fixed at bottom of page)
  const footerY = pageHeight - 12;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Thank you for your business!  •  ${invoice.companyWebsite || "https://ceylonhosting.tech"}  •  WhatsApp: ${invoice.companyPhone || "+94 78 890 1407"}`,
    margin,
    footerY + 4.5,
  );
  doc.text(
    `Generated by CeylonHosting Billing System`,
    pageWidth - margin,
    footerY + 4.5,
    { align: "right" },
  );

  return doc;
}
