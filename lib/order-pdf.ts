import { StoreOrder } from "@/lib/store-service";
import { formatMoney } from "@/lib/currency";

export interface EnrichedOrderItem {
  productId?: number | string;
  variantId?: number | string;
  name: string;
  brand: string;
  category: string;
  color: string;
  gender: string;
  location: string;
  sku: string;
  barcode: string;
  size: string;
  qty: number;
  price: number;
  subtotal: number;
  imageUrl: string;
  checked?: boolean;
}

export interface GenerateOrderPdfOptions {
  order: StoreOrder;
  products?: any[];
  businessSettings?: any;
  currency?: string;
  checkedItems?: Record<string, boolean>;
  includePhotos?: boolean;
}

/**
 * Convierte cualquier URL de imagen (incluyendo WebP, PNG, JPG o dataURL)
 * a un DataURL JPEG compatible con jsPDF sobre fondo blanco.
 */
async function loadImageAsJpegDataUrl(
  url: string,
  targetSize = 240
): Promise<string | null> {
  if (!url || typeof window === "undefined") return null;

  const drawImgToCanvas = (img: HTMLImageElement): string | null => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Fondo blanco limpio para transparencias
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetSize, targetSize);

      // Ajuste tipo "cover" centrado para que la miniatura quede cuadrada y prolija
      const iw = img.naturalWidth || img.width || targetSize;
      const ih = img.naturalHeight || img.height || targetSize;
      const scale = Math.max(targetSize / iw, targetSize / ih);
      const sw = targetSize / scale;
      const sh = targetSize / scale;
      const sx = (iw - sw) / 2;
      const sy = (ih - sh) / 2;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetSize, targetSize);
      return canvas.toDataURL("image/jpeg", 0.9);
    } catch {
      return null;
    }
  };

  // Helper para cargar una URL en un HTMLImageElement con CORS y dibujar al canvas
  const tryLoadUrlToCanvas = (targetUrl: string, useCors = true): Promise<string | null> =>
    new Promise<string | null>((resolve) => {
      const img = new Image();
      if (useCors && !targetUrl.startsWith("data:") && !targetUrl.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }
      const timeout = setTimeout(() => resolve(null), 6000);
      img.onload = () => {
        clearTimeout(timeout);
        resolve(drawImgToCanvas(img));
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      img.src = targetUrl;
    });

  // Si ya es dataURL, convertir directamente
  if (url.startsWith("data:")) {
    return await tryLoadUrlToCanvas(url, false);
  }

  // Intento 1: Fetch con cache: "reload" para evitar respuestas cacheadas por <img> sin cabeceras CORS
  try {
    const resp = await fetch(url, { mode: "cors", cache: "reload" });
    if (resp.ok) {
      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);
      const result = await tryLoadUrlToCanvas(objectUrl, false);
      URL.revokeObjectURL(objectUrl);
      if (result) return result;
    }
  } catch {
    // Continuar al siguiente intento si falla fetch directo
  }

  // Intento 2: Carga con Image + crossOrigin anonymous + cache-buster para forzar cabeceras CORS frescas
  const cacheBustedUrl = `${url}${url.includes("?") ? "&" : "?"}_cb=${Date.now()}`;
  const directLoad = await tryLoadUrlToCanvas(cacheBustedUrl, true);
  if (directLoad) return directLoad;

  // Intento 3: Proxy de optimización de imágenes con soporte CORS universal (wsrv.nl)
  try {
    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${targetSize}&h=${targetSize}&fit=cover&output=jpg`;
    const proxiedLoad = await tryLoadUrlToCanvas(proxyUrl, true);
    if (proxiedLoad) return proxiedLoad;
  } catch {
    // Ignorar error de proxy
  }

  return null;
}

/**
 * Extrae la primera imagen válida de un producto o ítem en cualquier formato.
 */
function extractProductImageUrl(item: any, matchedProduct: any): string {
  const candidates: any[] = [
    item?.imageUrl,
    item?.image_url,
    item?.image,
    matchedProduct?.image_url,
    matchedProduct?.imageUrl,
    matchedProduct?.image,
  ];

  if (Array.isArray(matchedProduct?.images)) {
    candidates.push(...matchedProduct.images);
  } else if (typeof matchedProduct?.images === "string" && matchedProduct.images.trim()) {
    try {
      const parsed = JSON.parse(matchedProduct.images);
      if (Array.isArray(parsed)) candidates.push(...parsed);
    } catch {
      candidates.push(matchedProduct.images);
    }
  }

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      return c.trim();
    }
  }
  return "";
}

/**
 * Cruza cada ítem del pedido con el catálogo de productos para obtener
 * todas las especificaciones técnicas (marca, categoría, color, ubicación, SKU, EAN-13, imagen).
 */
export function resolveOrderItemsWithSpecs(
  order: StoreOrder,
  products: any[] = [],
  checkedItems: Record<string, boolean> = {}
): EnrichedOrderItem[] {
  return (order.items || []).map((item, idx) => {
    const matchedProduct = (products || []).find(
      (p: any) =>
        (item.productId !== undefined &&
          String(p.id) === String(item.productId)) ||
        (item.name &&
          p.name &&
          String(p.name).trim().toLowerCase() ===
            String(item.name).trim().toLowerCase())
    );

    const imageUrl = extractProductImageUrl(item, matchedProduct);

    return {
      productId: item.productId,
      variantId: item.variantId,
      name: item.name || matchedProduct?.name || "Artículo",
      brand: item.brand || matchedProduct?.brand || "",
      category: matchedProduct?.category || "",
      color: matchedProduct?.color || "",
      gender:
        matchedProduct?.gender && matchedProduct.gender !== "No aplica"
          ? matchedProduct.gender
          : "",
      location: matchedProduct?.location || "",
      sku: matchedProduct?.sku || "",
      barcode: matchedProduct?.barcode || "",
      size: item.size || "Único",
      qty: Number(item.qty) || 1,
      price: Number(item.price) || 0,
      subtotal:
        Number(item.subtotal) ||
        (Number(item.qty) || 1) * (Number(item.price) || 0),
      imageUrl,
      checked: Boolean(checkedItems[`${order.id}-${idx}`]),
    };
  });
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: "PENDIENTE DE CONFIRMACIÓN",
  confirmado: "CONFIRMADO",
  en_preparacion: "EN PREPARACIÓN",
  listo: "LISTO PARA ENTREGA",
  entregado: "ENTREGADO",
  cancelado: "CANCELADO",
};

export async function downloadOrderControlPdf({
  order,
  products = [],
  businessSettings = {},
  currency = "ARS",
  checkedItems = {},
  includePhotos = true,
}: GenerateOrderPdfOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const enrichedItems = resolveOrderItemsWithSpecs(
    order,
    products,
    checkedItems
  );

  // Precargar imágenes en paralelo (productos + logo del negocio)
  const logoUrl = businessSettings?.logo_url || "";
  const [logoDataUrl, ...itemImageDataUrls] = await Promise.all([
    logoUrl ? loadImageAsJpegDataUrl(logoUrl, 200) : Promise.resolve(null),
    ...enrichedItems.map((it) =>
      includePhotos && it.imageUrl
        ? loadImageAsJpegDataUrl(it.imageUrl, 220)
        : Promise.resolve(null)
    ),
  ]);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2; // 186mm

  const businessName = (
    businessSettings?.business_name || "CR BAZAR"
  ).toUpperCase();
  const branchName = businessSettings?.branch_name || "Casa Central";
  const businessAddress = businessSettings?.address || "";
  const businessPhone =
    businessSettings?.phone || businessSettings?.whatsapp || "";
  const businessTaxId = businessSettings?.tax_id || "";
  const businessEmail = businessSettings?.email || "";

  const orderCurrency = order.currency || currency || "ARS";
  const money = (val: number) => formatMoney(val, orderCurrency);

  const createdDateStr = (() => {
    try {
      const d = new Date(order.createdAt);
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return order.createdAt || "";
    }
  })();

  let cursorY = 12;

  // =========================================================================
  // 1. ENCABEZADO CORPORATIVO (Tipo Remito / Ficha de Control)
  // =========================================================================
  const headerHeight = 32;
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(marginX, cursorY, contentWidth, headerHeight, 2.5, 2.5, "FD");

  // Caja central "R" (Remito / Control)
  const centerBoxW = 16;
  const centerBoxH = 16;
  const centerBoxX = pageWidth / 2 - centerBoxW / 2;
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(centerBoxX, cursorY + 3, centerBoxW, centerBoxH, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("R", pageWidth / 2, cursorY + 12.5, { align: "center" });
  doc.setFontSize(5.5);
  doc.text("CONTROL", pageWidth / 2, cursorY + 17, { align: "center" });

  // Línea divisoria vertical bajo la caja R
  doc.setDrawColor(203, 213, 225);
  doc.line(
    pageWidth / 2,
    cursorY + 19,
    pageWidth / 2,
    cursorY + headerHeight
  );

  // Columna Izquierda: Datos de la Empresa + Logo
  let leftTextX = marginX + 4;
  if (logoDataUrl) {
    try {
      doc.addImage(
        logoDataUrl,
        "JPEG",
        marginX + 3.5,
        cursorY + 4,
        16,
        16,
        undefined,
        "FAST"
      );
      leftTextX = marginX + 22;
    } catch {}
  }

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(businessName.slice(0, 28), leftTextX, cursorY + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  let leftSubY = cursorY + 14;
  if (branchName) {
    doc.text(`Sucursal: ${branchName}`, leftTextX, leftSubY);
    leftSubY += 4;
  }
  if (businessAddress) {
    doc.text(`Dir.: ${businessAddress.slice(0, 42)}`, leftTextX, leftSubY);
    leftSubY += 4;
  }
  const phoneAndTax = [
    businessPhone ? `Tel/WA: ${businessPhone}` : "",
    businessTaxId ? `CUIT: ${businessTaxId}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  if (phoneAndTax) {
    doc.text(phoneAndTax, leftTextX, leftSubY);
    leftSubY += 4;
  }
  if (businessEmail && leftSubY <= cursorY + 29) {
    doc.text(businessEmail, leftTextX, leftSubY);
  }

  // Columna Derecha: Título del Documento y Datos del Pedido
  const rightX = pageWidth - marginX - 4;
  doc.setTextColor(88, 28, 135); // Tono púrpura corporativo de Control
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text("REMITO / FICHA DE CONTROL DE PEDIDO", rightX, cursorY + 8, {
    align: "right",
  });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text(`PEDIDO ${order.orderNumber}`, rightX, cursorY + 15, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha y hora: ${createdDateStr}`, rightX, cursorY + 20.5, {
    align: "right",
  });

  const channelLabel = `CANAL ${(order.channel || "minorista").toUpperCase()}`;
  const statusLabel = STATUS_LABELS[order.status] || order.status.toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${channelLabel}  |  ESTADO: ${statusLabel}`, rightX, cursorY + 26, {
    align: "right",
  });

  cursorY += headerHeight + 4;

  // =========================================================================
  // 2. DATOS DEL CLIENTE Y ENTREGA
  // =========================================================================
  const hasNotes = Boolean(order.customerNotes && order.customerNotes.trim());
  const customerBoxHeight = hasNotes ? 26 : 19;

  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(
    marginX,
    cursorY,
    contentWidth,
    customerBoxHeight,
    2,
    2,
    "FD"
  );

  // Mitad izquierda: Cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("CLIENTE / DESTINATARIO", marginX + 4, cursorY + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(
    (order.customerName || "Cliente").slice(0, 45),
    marginX + 4,
    cursorY + 10.5
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Teléfono / WhatsApp: ${order.customerPhone || "—"}`,
    marginX + 4,
    cursorY + 15.5
  );

  // Mitad derecha: Modalidad de Entrega y Dirección
  const midX = pageWidth / 2 + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("LOGÍSTICA Y ENTREGA", midX, cursorY + 5);

  const deliveryLabel =
    order.deliveryType === "pickup"
      ? "RETIRO EN DEPÓSITO / LOCAL"
      : "ENVÍO A DOMICILIO / TRANSPORTE";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(deliveryLabel, midX, cursorY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const addressText =
    order.deliveryType === "pickup"
      ? "El cliente retira por mostrador / depósito"
      : `Dirección: ${order.customerAddress || "A coordinar con el cliente"}`;
  doc.text(addressText.slice(0, 54), midX, cursorY + 15.5);

  // Notas del cliente si existen
  if (hasNotes) {
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 224, 71);
    doc.roundedRect(
      marginX + 3,
      cursorY + 18,
      contentWidth - 6,
      6,
      1,
      1,
      "FD"
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    const cleanNote = String(order.customerNotes || "")
      .replace(/\s+/g, " ")
      .trim();
    doc.text(
      `OBSERVACIONES DEL CLIENTE: "${cleanNote.slice(0, 95)}"`,
      marginX + 5,
      cursorY + 22
    );
  }

  cursorY += customerBoxHeight + 5;

  // =========================================================================
  // 3. TABLA DE PRODUCTOS CON FOTOS Y ESPECIFICACIONES DETALLADAS
  // =========================================================================
  const fitTextToWidth = (str: string, maxWidthMm: number): string => {
    if (!str || maxWidthMm <= 5) return "";
    if (doc.getTextWidth(str) <= maxWidthMm) return str;
    let out = str;
    while (out.length > 1 && doc.getTextWidth(`${out}...`) > maxWidthMm) {
      out = out.slice(0, -1);
    }
    return `${out.trim()}...`;
  };

  const drawTableHeader = (y: number): number => {
    // Subtítulo de sección
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `DETALLE Y ESPECIFICACIÓN DE ARTÍCULOS (${order.totalUnits} UNIDADES EN ${enrichedItems.length} ${
        enrichedItems.length === 1 ? "ÍTEM" : "ÍTEMS"
      })`,
      marginX,
      y + 3.5
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Control visual de artículos y cantidades",
      pageWidth - marginX,
      y + 3.5,
      { align: "right" }
    );

    const headerY = y + 5.5;
    const hHeight = 7.5;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(marginX, headerY, contentWidth, hHeight, 1.2, 1.2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(255, 255, 255);

    // Posiciones de columnas (total = 186mm)
    // [CTRL: 12mm] [FOTO: 22mm] [ESPECIFICACIÓN: 96mm] [CANT: 18mm] [P.UNIT: 19mm] [SUBTOTAL: 19mm]
    doc.text("CTRL", marginX + 6, headerY + 5, { align: "center" });
    if (includePhotos) {
      doc.text("IMAGEN", marginX + 23, headerY + 5, { align: "center" });
      doc.text("PRODUCTO Y ESPECIFICACIONES TÉCNICAS", marginX + 36, headerY + 5);
    } else {
      doc.text("PRODUCTO Y ESPECIFICACIONES TÉCNICAS", marginX + 15, headerY + 5);
    }
    doc.text("CANT.", marginX + 139, headerY + 5, { align: "center" });
    doc.text("P. UNIT.", marginX + 165, headerY + 5, { align: "right" });
    doc.text("SUBTOTAL", marginX + 184, headerY + 5, { align: "right" });

    return headerY + hHeight + 1.5;
  };

  cursorY = drawTableHeader(cursorY);

  const rowHeight = includePhotos ? 26 : 21;
  const bottomLimit = pageHeight - 24;

  enrichedItems.forEach((item, index) => {
    // Salto de página automático si la fila no entra completa
    if (cursorY + rowHeight > bottomLimit) {
      doc.addPage();
      cursorY = 14;
      cursorY = drawTableHeader(cursorY);
    }

    // Fondo alternado y borde de fila
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(marginX, cursorY, contentWidth, rowHeight, 1.5, 1.5, "FD");

    // 1. Casilla de Control (CTRL)
    const checkSize = 6.5;
    const checkX = marginX + 2.8;
    const checkY = cursorY + rowHeight / 2 - checkSize / 2;
    if (item.checked) {
      doc.setFillColor(16, 185, 129);
      doc.setDrawColor(5, 150, 105);
      doc.roundedRect(checkX, checkY, checkSize, checkSize, 1.2, 1.2, "FD");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("OK", checkX + checkSize / 2, checkY + 4.5, { align: "center" });
    } else {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.35);
      doc.roundedRect(checkX, checkY, checkSize, checkSize, 1.2, 1.2, "FD");
      doc.setLineWidth(0.2);
    }

    // 2. Miniatura de Imagen del Producto
    let specStartX = marginX + 14;
    if (includePhotos) {
      const thumbSize = 21;
      const thumbX = marginX + 12.5;
      const thumbY = cursorY + (rowHeight - thumbSize) / 2;
      const imgData = itemImageDataUrls[index];

      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(thumbX, thumbY, thumbSize, thumbSize, 1.5, 1.5, "FD");

      if (imgData) {
        try {
          doc.addImage(
            imgData,
            "JPEG",
            thumbX + 0.4,
            thumbY + 0.4,
            thumbSize - 0.8,
            thumbSize - 0.8,
            undefined,
            "FAST"
          );
        } catch {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          doc.text("SIN FOTO", thumbX + thumbSize / 2, thumbY + thumbSize / 2 + 1, {
            align: "center",
          });
        }
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(5.8);
        doc.setTextColor(148, 163, 184);
        doc.text("SIN FOTO", thumbX + thumbSize / 2, thumbY + thumbSize / 2 + 1, {
          align: "center",
        });
      }

      specStartX = marginX + 36.5;
    }

    const qtyBoxW = 15;
    const qtyBoxH = 9;
    const qtyBoxX = marginX + 131.5;
    const specMaxRightX = qtyBoxX - 3;

    // 3. Especificaciones completas del Producto (en 4 líneas independientes sin encimar)
    // Línea 1: Nombre del producto (# orden + nombre)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const titleStr = fitTextToWidth(
      `${index + 1}. ${item.name}`,
      specMaxRightX - specStartX
    );
    doc.text(titleStr, specStartX, cursorY + 5.8);

    // Línea 2: Badge de Variante/Talle + Ubicación (si tiene)
    let badgeX = specStartX;
    const line2Y = cursorY + 11.5;

    const variantText = `VARIANTE / TALLE: ${item.size || "Único"}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    const badgeW = doc.getTextWidth(variantText) + 4;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(147, 197, 253);
    doc.roundedRect(badgeX, line2Y - 3.5, badgeW, 4.8, 1, 1, "FD");
    doc.setTextColor(29, 78, 216);
    doc.text(variantText, badgeX + 2, line2Y - 0.1);

    badgeX += badgeW + 2.5;

    if (item.location && specMaxRightX - badgeX > 18) {
      const locText = fitTextToWidth(`Ubicación: ${item.location}`, specMaxRightX - badgeX - 4);
      const locW = doc.getTextWidth(locText) + 4;
      doc.setFillColor(243, 232, 255);
      doc.setDrawColor(216, 180, 254);
      doc.roundedRect(badgeX, line2Y - 3.5, locW, 4.8, 1, 1, "FD");
      doc.setTextColor(107, 33, 168);
      doc.text(locText, badgeX + 2, line2Y - 0.1);
    }

    // Línea 3: Marca, Color/Presentación y Categoría (en su propio renglón despejado)
    const line3Y = cursorY + 17.2;
    const specsLine2 = [
      item.brand ? `Marca: ${item.brand}` : "",
      item.color ? `Color/Pres.: ${item.color}` : "",
      item.category ? `Categoría: ${item.category}` : "",
    ]
      .filter(Boolean)
      .join("   •   ");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(51, 65, 85);
    doc.text(
      fitTextToWidth(
        specsLine2 || "Artículo de catálogo general",
        specMaxRightX - specStartX
      ),
      specStartX,
      line3Y
    );

    // Línea 4: SKU, Código de barras EAN-13 y Público
    const line4Y = cursorY + 22.3;
    const specsLine3 = [
      item.sku ? `SKU: ${item.sku}` : "",
      item.barcode ? `EAN: ${item.barcode}` : "",
      item.gender ? `Público: ${item.gender}` : "",
    ]
      .filter(Boolean)
      .join("   •   ");

    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(
      fitTextToWidth(
        specsLine3 || "Sin código adicional",
        specMaxRightX - specStartX
      ),
      specStartX,
      line4Y
    );

    // 4. Cantidad destacada en recuadro
    const qtyBoxY = cursorY + rowHeight / 2 - qtyBoxH / 2;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(qtyBoxX, qtyBoxY, qtyBoxW, qtyBoxH, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`x${item.qty}`, qtyBoxX + qtyBoxW / 2, qtyBoxY + 6, {
      align: "center",
    });

    // 5. Precio Unitario
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(money(item.price), marginX + 165, cursorY + rowHeight / 2 + 1, {
      align: "right",
    });

    // 6. Subtotal
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.8);
    doc.setTextColor(15, 23, 42);
    doc.text(money(item.subtotal), marginX + 184, cursorY + rowHeight / 2 + 1, {
      align: "right",
    });

    cursorY += rowHeight + 1.8;
  });

  // =========================================================================
  // 4. BLOQUE FINAL: RESUMEN DEL PEDIDO (Alineado a la derecha)
  // =========================================================================
  const summaryBlockHeight = 42;
  if (cursorY + summaryBlockHeight > pageHeight - 18) {
    doc.addPage();
    cursorY = 16;
  } else {
    cursorY += 3;
  }

  // Caja derecha: Resumen de Unidades y Total Monetario
  const rightBoxW = 78;
  const rightBoxX = pageWidth - marginX - rightBoxW;
  doc.setDrawColor(15, 23, 42);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(
    rightBoxX,
    cursorY,
    rightBoxW,
    summaryBlockHeight,
    2,
    2,
    "FD"
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text("RESUMEN DEL PEDIDO", rightBoxX + 4, cursorY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text("Referencias / Renglones:", rightBoxX + 4, cursorY + 13);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${enrichedItems.length} ${enrichedItems.length === 1 ? "artículo" : "artículos"}`,
    rightBoxX + rightBoxW - 4,
    cursorY + 13,
    { align: "right" }
  );

  doc.setFont("helvetica", "normal");
  doc.text("Total unidades a entregar:", rightBoxX + 4, cursorY + 19.5);
  doc.setFont("helvetica", "bold");
  doc.text(
    `${order.totalUnits} ${order.totalUnits === 1 ? "unidad" : "unidades"}`,
    rightBoxX + rightBoxW - 4,
    cursorY + 19.5,
    { align: "right" }
  );

  // Franja oscura inferior con el Total General
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(
    rightBoxX + 2.5,
    cursorY + 25,
    rightBoxW - 5,
    14,
    1.5,
    1.5,
    "F"
  );
  doc.setTextColor(203, 213, 225);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("TOTAL A COBRAR / ENTREGAR", rightBoxX + 5.5, cursorY + 30);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(
    money(order.totalAmount),
    rightBoxX + rightBoxW - 5.5,
    cursorY + 36,
    { align: "right" }
  );

  // =========================================================================
  // 5. PIE DE PÁGINA EN TODAS LAS HOJAS (Numeración y referencia)
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${businessName} · Remito y Ficha de Control Interno · Pedido ${order.orderNumber} (${order.customerName})`,
      marginX,
      pageHeight - 7.5
    );
    doc.setFont("helvetica", "bold");
    doc.text(
      `Página ${p} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7.5,
      { align: "right" }
    );
  }

  const safeOrderNo = (order.orderNumber || "Pedido").replace(
    /[^a-zA-Z0-9_-]/g,
    "_"
  );
  const safeCustomer = (order.customerName || "Cliente")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 24);

  doc.save(`Remito_Control_${safeOrderNo}_${safeCustomer}.pdf`);
}

