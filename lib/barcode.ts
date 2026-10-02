import JsBarcode from "jsbarcode";

export interface BarcodeOptions {
  height?: number;
  width?: number;
  margin?: number;
  displayValue?: boolean;
  background?: string;
  lineColor?: string;
  fontSize?: number;
  format?: "EAN13" | "CODE128" | "AUTO";
}

export type Barcode128Options = BarcodeOptions;

/**
 * Limpia la cadena recibida desde una pistola lectora física (láser o CCD).
 * Elimina saltos de línea (\r, \n), tabs, caracteres de control no imprimibles
 * y prefijos AIM (como ]E0, ]C1) que configuran algunos lectores industriales.
 */
export function cleanBarcodeScan(rawInput: string | number | null | undefined): string {
  if (rawInput === null || rawInput === undefined) return "";
  let clean = String(rawInput);

  // Eliminar prefijos de simbología AIM (ej: ]E0 para EAN-13, ]C1 para Code 128)
  clean = clean.replace(/^\][A-Za-z0-9]{2,3}/, "");

  // Eliminar retornos de carro, saltos de línea, tabulaciones y caracteres de control ASCII (0x00 a 0x1F y 0x7F a 0x9F)
  clean = clean.replace(/[\r\n\t\f\v]/g, "");
  clean = clean.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

  return clean.trim();
}

/**
 * Calcula el dígito verificador oficial EAN-13 (Dígito 13)
 * según el algoritmo estándar GS1 Módulo 10.
 *
 * Ponderación estándar GS1:
 * - Posiciones impares (1, 3, 5, 7, 9, 11) multiplicadas por 1
 * - Posiciones pares (2, 4, 6, 8, 10, 12) multiplicadas por 3
 * - Check digit = (10 - (Suma % 10)) % 10
 */
export function calculateEan13CheckDigit(twelveDigits: string): number {
  const digitsOnly = twelveDigits.replace(/\D/g, "");
  if (digitsOnly.length < 12) {
    throw new Error("Se requieren al menos 12 dígitos para calcular el dígito verificador EAN-13.");
  }
  const digits = digitsOnly.slice(0, 12).split("").map(Number);

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    // i es 0-indexed: i=0 (pos 1, impar), i=1 (pos 2, par), etc.
    sum += i % 2 === 0 ? digits[i] * 1 : digits[i] * 3;
  }

  const remainder = sum % 10;
  return remainder === 0 ? 0 : 10 - remainder;
}

/**
 * Valida si un código corresponde a un EAN-13 estándar oficial GS1
 * con longitud exacta de 13 dígitos y dígito verificador matemáticamente correcto.
 */
export function isValidEan13(code: string | number | null | undefined): boolean {
  if (!code) return false;
  const clean = String(code).trim();
  if (!/^\d{13}$/.test(clean)) return false;

  const twelveDigits = clean.slice(0, 12);
  const actualCheck = Number(clean[12]);
  const expectedCheck = calculateEan13CheckDigit(twelveDigits);

  return actualCheck === expectedCheck;
}

/**
 * Normaliza cualquier entrada a un EAN-13 matemáticamente válido:
 * - Si tiene 12 dígitos numéricos, le añade el 13° oficial.
 * - Si tiene 13 dígitos pero el dígito verificador es incorrecto, lo recalcula y sustituye.
 * - Si no es de 12 ni 13 dígitos numéricos, devuelve la cadena limpia.
 */
export function normalizeToValidEan13(code: string | number | null | undefined): string {
  if (!code) return "";
  const clean = cleanBarcodeScan(code);
  const digitsOnly = clean.replace(/\D/g, "");

  if (digitsOnly.length === 12) {
    const check = calculateEan13CheckDigit(digitsOnly);
    return `${digitsOnly}${check}`;
  }

  if (digitsOnly.length === 13) {
    const twelve = digitsOnly.slice(0, 12);
    const check = calculateEan13CheckDigit(twelve);
    return `${twelve}${check}`;
  }

  return clean;
}

/**
 * Genera un código EAN-13 aleatorio 100% válido según la norma oficial GS1
 * con el prefijo especificado (por defecto '779', prefijo comercial común en la región).
 */
export function generateValidEan13(prefix = "779"): string {
  const cleanPrefix = String(prefix).replace(/\D/g, "") || "779";
  const neededRandomDigits = Math.max(0, 12 - cleanPrefix.length);

  let middle = "";
  for (let i = 0; i < neededRandomDigits; i++) {
    middle += Math.floor(Math.random() * 10).toString();
  }

  const twelveDigits = `${cleanPrefix}${middle}`.slice(0, 12);
  const checkDigit = calculateEan13CheckDigit(twelveDigits);

  return `${twelveDigits}${checkDigit}`;
}

/**
 * Compara de forma inteligente el código escaneado por una pistola física con el código en base de datos.
 * Resuelve discrepancias frecuentes en retail:
 * 1. Pistola envía EAN-13 (13 dígitos) y la base tiene 12 dígitos (o viceversa).
 * 2. Pistola envía código UPC-A (12 dígitos) y la base tiene EAN-13 con prefijo '0'.
 * 3. Ambos tienen 13 dígitos pero uno tenía dígito verificador mal calculado en la base.
 * 4. Coincidencia directa o insensible a mayúsculas (para SKUs alfanuméricos).
 */
export function isBarcodeMatch(
  storedCode: string | number | null | undefined,
  scannedCode: string | number | null | undefined
): boolean {
  const stored = cleanBarcodeScan(storedCode);
  const scanned = cleanBarcodeScan(scannedCode);

  if (!stored || !scanned) return false;

  // 1. Coincidencia exacta o insensible a mayúsculas
  if (stored === scanned || stored.toLowerCase() === scanned.toLowerCase()) {
    return true;
  }

  const storedDigits = stored.replace(/\D/g, "");
  const scannedDigits = scanned.replace(/\D/g, "");

  // Si ambos son puramente numéricos
  if (storedDigits.length > 0 && scannedDigits.length > 0) {
    // Si ambos dígitos coinciden exactamente
    if (storedDigits === scannedDigits) return true;

    // Discrepancia 12 vs 13 dígitos:
    // Caso A: Scanned es 13 dígitos y Stored es 12 dígitos
    if (scannedDigits.length === 13 && storedDigits.length === 12) {
      if (scannedDigits.slice(0, 12) === storedDigits) return true;
      if (scannedDigits === normalizeToValidEan13(storedDigits)) return true;
      if (scannedDigits === `0${storedDigits}`) return true; // UPC-A a EAN-13
    }

    // Caso B: Stored es 13 dígitos y Scanned es 12 dígitos
    if (storedDigits.length === 13 && scannedDigits.length === 12) {
      if (storedDigits.slice(0, 12) === scannedDigits) return true;
      if (storedDigits === normalizeToValidEan13(scannedDigits)) return true;
      if (storedDigits === `0${scannedDigits}`) return true; // UPC-A a EAN-13
    }

    // Caso C: Ambos son 13 dígitos pero difieren solo en el dígito de chequeo por error de tipeo previo en base de datos
    if (storedDigits.length === 13 && scannedDigits.length === 13) {
      if (storedDigits.slice(0, 12) === scannedDigits.slice(0, 12)) return true;
    }
  }

  return false;
}

/**
 * Genera el markup SVG para un código de barras industrial.
 *
 * - Si es numérico de 12 o 13 dígitos, genera formato oficial EAN13 (normalizando el dígito de control).
 * - Si es alfanumérico o longitud diferente, genera CODE128 (universal y de alta densidad).
 * - Si EAN13 falla por cualquier motivo, aplica un fallback silencioso a CODE128.
 *
 * Opciones críticas para lectores físicos ópticos (láser/CCD) e impresoras térmicas:
 * - margin: 10 (quiet zone obligatoria para que el sensor láser detecte el inicio/fin del código).
 * - shape-rendering: "crispEdges" (evita bordes difuminados por anti-aliasing al imprimir en papel térmico).
 * - preserveAspectRatio: "xMidYMid meet" (impide la deformación anamórfica de las barras).
 * - background: blanco "#ffffff" y líneas negras "#000000" para máximo contraste óptico.
 */
export function generateBarcodeSvg(
  rawValue: string | number | null | undefined,
  options: BarcodeOptions = {}
): string {
  if (typeof window === "undefined" && typeof document === "undefined") {
    return "";
  }

  const clean = cleanBarcodeScan(rawValue) || "000000";
  const digitsOnly = clean.replace(/\D/g, "");

  // Determinar formato adecuado
  let chosenFormat: "EAN13" | "CODE128" = "CODE128";
  let valueToEncode = clean;

  if (options.format === "EAN13") {
    chosenFormat = "EAN13";
    valueToEncode = normalizeToValidEan13(clean);
  } else if (options.format === "CODE128") {
    chosenFormat = "CODE128";
    valueToEncode = clean.replace(/[^\x20-\x7E]/g, "") || "000000";
  } else {
    // Modo AUTO: si tiene 12 o 13 dígitos numéricos, usar EAN13 oficial
    if (digitsOnly.length === 12 || digitsOnly.length === 13) {
      chosenFormat = "EAN13";
      valueToEncode = normalizeToValidEan13(digitsOnly);
    } else {
      chosenFormat = "CODE128";
      valueToEncode = clean.replace(/[^\x20-\x7E]/g, "") || "000000";
    }
  }

  const opts = {
    width: options.width ?? 1.8,
    height: options.height ?? 40,
    displayValue: options.displayValue ?? false,
    margin: options.margin ?? 10, // Quiet zone obligatoria
    background: options.background ?? "#ffffff",
    lineColor: options.lineColor ?? "#000000",
    fontSize: options.fontSize ?? 12,
    font: "monospace",
    textMargin: 3,
  };

  const createSvgWithFormat = (fmt: "EAN13" | "CODE128", val: string): string => {
    const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svgNode, val, {
      ...opts,
      format: fmt,
    });

    // Atributos obligatorios para evitar deformaciones y garantizar lectura óptica
    svgNode.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svgNode.setAttribute("shape-rendering", "crispEdges");
    svgNode.style.shapeRendering = "crispEdges";
    svgNode.classList.add("barcode-svg", `barcode-${fmt.toLowerCase()}`);

    return svgNode.outerHTML;
  };

  try {
    return createSvgWithFormat(chosenFormat, valueToEncode);
  } catch (err) {
    // Fallback silencioso a CODE128 si EAN13 rechaza el valor
    if (chosenFormat === "EAN13") {
      try {
        const safeCode128Value = clean.replace(/[^\x20-\x7E]/g, "") || "000000";
        return createSvgWithFormat("CODE128", safeCode128Value);
      } catch (fallbackErr) {
        console.error("Error en fallback a CODE128:", fallbackErr);
        return "";
      }
    }
    console.error("Error generando código de barras:", err);
    return "";
  }
}

/**
 * Alias de compatibilidad hacia atrás para código existente que invoque generateBarcode128Svg.
 */
export function generateBarcode128Svg(
  rawValue: string | number,
  options: BarcodeOptions = {}
): string {
  return generateBarcodeSvg(rawValue, { ...options, format: options.format || "AUTO" });
}
