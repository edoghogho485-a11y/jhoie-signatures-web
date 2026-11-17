import type { CartItem, CustomOrderPayload } from '../types/fashion';

export function formatNaira(amount: number): string {
  return `₦${new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function buildProductWhatsAppMessage(params: {
  productName: string;
  priceNgn: number;
  size: string;
  color: string;
  quantity: number;
  isSample?: boolean;
}): string {
  const priceLabel = params.isSample ? 'Listed Sample Price' : 'Price';
  return [
    'Hello JHOIE SIGNATURES,',
    'I would like to inquire about / order the following item:',
    '',
    `• Item: ${params.productName}`,
    `• Size: ${params.size}`,
    `• Colour: ${params.color}`,
    `• Quantity: ${params.quantity}`,
    `• ${priceLabel}: ${formatNaira(params.priceNgn * params.quantity)}`,
    '',
    'Please confirm availability and next steps.',
  ].join('\n');
}

export function buildCartWhatsAppMessage(params: {
  items: CartItem[];
  subtotalNgn: number;
  customerName?: string;
  phoneNumber?: string;
  deliveryAddress?: string;
  cityState?: string;
  referenceCode?: string;
  isSample?: boolean;
}): string {
  const subtotalLabel = params.isSample ? 'Estimated Sample Subtotal' : 'Estimated Subtotal';
  const lines = [
    'Hello JHOIE SIGNATURES,',
    params.referenceCode
      ? `I am confirming my Order Request (${params.referenceCode}):`
      : 'I would like to place an order from my Shopping Bag:',
    '',
    ...params.items.map(
      (item, index) =>
        `${index + 1}. ${item.name} (${item.selectedSize}, ${item.selectedColor}) × ${item.quantity} — ${formatNaira(
          item.priceNgn * item.quantity
        )}`
    ),
    '',
    `${subtotalLabel}: ${formatNaira(params.subtotalNgn)}`,
  ];

  if (params.customerName) {
    lines.push('', `Name: ${params.customerName}`);
  }
  if (params.phoneNumber) {
    lines.push(`Phone: ${params.phoneNumber}`);
  }
  if (params.deliveryAddress || params.cityState) {
    lines.push(
      `Delivery Location: ${[params.deliveryAddress, params.cityState].filter(Boolean).join(', ')}`
    );
  }

  lines.push('', 'Thank you.');
  return lines.join('\n');
}

export function buildCustomOrderWhatsAppMessage(order: CustomOrderPayload): string {
  const measurementParts = [
    order.measurements.bust ? `Bust ${order.measurements.bust}` : null,
    order.measurements.waist ? `Waist ${order.measurements.waist}` : null,
    order.measurements.hips ? `Hips ${order.measurements.hips}` : null,
    order.measurements.shoulder ? `Shoulder ${order.measurements.shoulder}` : null,
    order.measurements.length ? `Length ${order.measurements.length}` : null,
  ].filter(Boolean);

  const lines = [
    'Hello JHOIE SIGNATURES,',
    order.referenceCode
      ? `I would like to request a custom-made outfit (Ref: ${order.referenceCode}):`
      : 'I would like to request a custom-made outfit:',
    '',
    `• Full Name: ${order.customerName}`,
    `• WhatsApp Phone: ${order.contactNumber}`,
  ];

  if (order.email?.trim()) {
    lines.push(`• Email: ${order.email.trim()}`);
  }

  lines.push(
    `• Outfit Type: ${order.outfitType}`,
    `• Outfit Description: ${order.outfitDescription}`,
    `• Preferred Colour: ${order.preferredColor}`,
    `• Preferred Fabric: ${order.preferredFabric?.trim() || 'Open to designer recommendation'}`
  );

  if (order.preferredOccasion?.trim()) {
    lines.push(`• Occasion: ${order.preferredOccasion.trim()}`);
  }

  lines.push(`• Preferred Delivery Date: ${order.preferredDeliveryDate}`);

  if (typeof order.budgetNgn === 'number' && order.budgetNgn > 0) {
    lines.push(`• Estimated Budget: ${formatNaira(order.budgetNgn)}`);
  }

  if (order.standardSizeReference && order.standardSizeReference !== 'Exact Measurements') {
    lines.push(`• Size Reference: ${order.standardSizeReference}`);
  }

  if (measurementParts.length > 0) {
    lines.push(`• Measurements (${order.measurementUnit}): ${measurementParts.join(', ')}`);
  }

  const combinedNotes = [order.measurements.notes?.trim(), order.additionalNotes?.trim()]
    .filter(Boolean)
    .join(' | ');

  if (combinedNotes) {
    lines.push(`• Additional Notes: ${combinedNotes}`);
  }

  if (order.referenceImageName) {
    lines.push(
      '',
      `• Reference Photo: I selected an inspiration photo ("${order.referenceImageName}") on the website and will attach it manually here in WhatsApp.`
    );
  }

  lines.push('', 'Please let me know availability, pricing, and next steps.');
  return lines.join('\n');
}
