/**
 * WhatsApp chat integration utilities.
 */

export const DEFAULT_WHATSAPP_NUMBER = "94788901407";

export function formatWhatsAppUrl(
  phoneNumber: string = DEFAULT_WHATSAPP_NUMBER,
  message: string,
): string {
  const digits = phoneNumber.replace(/\D/g, "") || DEFAULT_WHATSAPP_NUMBER;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppChat(
  phoneNumber: string = DEFAULT_WHATSAPP_NUMBER,
  message: string,
): void {
  const url = formatWhatsAppUrl(phoneNumber, message);
  if (typeof window !== "undefined") {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export function getProductWhatsAppMessage(product: {
  id?: string;
  name: string;
  price: number;
  type?: string;
}): string {
  const priceFormatted = `Rs. ${product.price.toLocaleString("en-LK")}`;
  const suffix = product.type === "server" ? " / month" : "";
  return `Hello CeylonHosting, I want to order/inquire about *${product.name}* (${priceFormatted}${suffix}). Could you please assist me?`;
}

export function getServerWhatsAppMessage(
  product: { name: string; price: number },
  config?: {
    serverName?: string;
    serverLocation?: string;
    extraSlots?: number | boolean;
    total?: number;
  },
): string {
  const totalPrice = config?.total ?? product.price;
  let text = `Hello CeylonHosting, I want to order a game server:\n`;
  text += `• Package: *${product.name}*\n`;
  if (config?.serverName) text += `• Server Name: ${config.serverName}\n`;
  if (config?.serverLocation) text += `• Location: ${config.serverLocation}\n`;
  if (config?.extraSlots) {
    const slots = typeof config.extraSlots === "number" ? config.extraSlots : 4;
    text += `• Extra Slots: +${slots} Slots\n`;
  }
  text += `• Price: Rs. ${totalPrice.toLocaleString("en-LK")}/month\n\n`;
  text += `Please let me know how to proceed with payment and activation.`;
  return text;
}

export function getCartWhatsAppMessage(
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
    details?: string;
  }>,
  total: number,
): string {
  let text = `Hello CeylonHosting, I want to place an order for the following items:\n\n`;
  items.forEach((item, index) => {
    const qty = item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : "";
    const detail = item.details ? ` - ${item.details}` : "";
    text += `${index + 1}. *${item.name}*${qty} - Rs. ${item.price.toLocaleString("en-LK")}${detail}\n`;
  });
  text += `\nTotal: *Rs. ${total.toLocaleString("en-LK")}*\n\n`;
  text += `Please assist me with completing this order.`;
  return text;
}
