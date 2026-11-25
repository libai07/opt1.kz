export function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

export function whatsappLink(phone: string, text: string): string {
  const p = cleanPhone(phone).replace(/^\+/, '');
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export function whatsappOrderLink(orderId: string, productTitle: string, businessPhone: string): string {
  const text = `Здравствуйте! Мой заказ ${orderId}: ${productTitle}. Подскажите, пожалуйста, по оплате.`;
  return whatsappLink(businessPhone, text);
}
