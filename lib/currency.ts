export type CurrencyCode = "BRL" | "ARS" | "USD";

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  locale: string;
  defaultDecimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  ARS: {
    code: "ARS",
    name: "Peso Argentino",
    symbol: "$",
    flag: "🇦🇷",
    locale: "es-AR",
    defaultDecimals: 0,
  },
  BRL: {
    code: "BRL",
    name: "Real Brasileño",
    symbol: "R$",
    flag: "🇧🇷",
    locale: "pt-BR",
    defaultDecimals: 2,
  },
  USD: {
    code: "USD",
    name: "Dólar Estadounidense",
    symbol: "US$",
    flag: "🇺🇸",
    locale: "en-US",
    defaultDecimals: 2,
  },
};

let currentSystemCurrency: CurrencyCode = "ARS";

export function setSystemCurrency(currency?: CurrencyCode | string | null): void {
  const code = String(currency || "ARS").toUpperCase();
  if (code in CURRENCIES) {
    currentSystemCurrency = code as CurrencyCode;
  }
}

export function getSystemCurrency(): CurrencyCode {
  return currentSystemCurrency;
}

export interface ExchangeRates {
  /** Cantidad de Pesos Argentinos (ARS) por 1 Real (BRL). Ej: 250 */
  exchangeRateArs?: number;
  /** Cantidad de Reales (BRL) por 1 Dólar (USD). Ej: 5.70 */
  exchangeRateUsd?: number;
  /** Compatibilidad hacia atrás: equivale a exchangeRateArs */
  exchange_rate_brl?: number;
  exchange_rate_ars?: number;
  exchange_rate_usd?: number;
}

export function extractRates(rates?: ExchangeRates): { rateArs: number; rateUsd: number } {
  const rateArs = Math.max(0.0001, Number(rates?.exchangeRateArs ?? rates?.exchange_rate_ars ?? rates?.exchange_rate_brl ?? 250) || 250);
  const rateUsd = Math.max(0.0001, Number(rates?.exchangeRateUsd ?? rates?.exchange_rate_usd ?? 5.7) || 5.7);
  return { rateArs, rateUsd };
}

/**
 * Formatea un valor monetario según la moneda indicada (por defecto Pesos Argentinos ARS, o Reales BRL si está configurado).
 */
export function formatMoney(
  value: number | string | null | undefined,
  currency?: CurrencyCode | string,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number }
): string {
  const num = Number(value) || 0;
  const targetCode = currency ? String(currency).toUpperCase() : currentSystemCurrency;
  const curr = (targetCode as CurrencyCode) in CURRENCIES
    ? (targetCode as CurrencyCode)
    : currentSystemCurrency;

  const config = CURRENCIES[curr] || CURRENCIES.ARS;

  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: options?.minimumFractionDigits ?? config.defaultDecimals,
    maximumFractionDigits: options?.maximumFractionDigits ?? config.defaultDecimals,
  }).format(num);
}

/**
 * Formatea un número sin el símbolo de moneda, con los separadores de miles y decimales del locale.
 */
export function formatNumber(
  value: number | string | null | undefined,
  currency?: CurrencyCode | string,
  decimals?: number
): string {
  const num = Number(value) || 0;
  const targetCode = currency ? String(currency).toUpperCase() : currentSystemCurrency;
  const curr = (targetCode as CurrencyCode) in CURRENCIES
    ? (targetCode as CurrencyCode)
    : currentSystemCurrency;

  const config = CURRENCIES[curr] || CURRENCIES.ARS;
  const dec = decimals ?? config.defaultDecimals;

  return new Intl.NumberFormat(config.locale, {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(num);
}

/**
 * Convierte un monto entre cualquiera de las 3 monedas (BRL, ARS, USD).
 * - rateArs: Cuántos ARS vale 1 BRL (ej: 250)
 * - rateUsd: Cuántos BRL vale 1 USD (ej: 5.70)
 */
export function convertAmount({
  amount,
  from,
  to,
  rates,
}: {
  amount: number | string | null | undefined;
  from: CurrencyCode | string;
  to: CurrencyCode | string;
  rates?: ExchangeRates;
}): number {
  const val = Number(amount) || 0;
  const fromCode = (String(from || "ARS").toUpperCase() as CurrencyCode) in CURRENCIES
    ? (String(from || "ARS").toUpperCase() as CurrencyCode)
    : "ARS";
  const toCode = (String(to || "ARS").toUpperCase() as CurrencyCode) in CURRENCIES
    ? (String(to || "ARS").toUpperCase() as CurrencyCode)
    : "ARS";

  if (fromCode === toCode || val === 0) return val;

  const { rateArs, rateUsd } = extractRates(rates);

  // 1. Convertir 'from' a BRL como pivote
  let amountInBrl = val;
  if (fromCode === "ARS") {
    amountInBrl = val / rateArs;
  } else if (fromCode === "USD") {
    amountInBrl = val * rateUsd;
  }

  // 2. Convertir de BRL a 'to'
  if (toCode === "BRL") {
    return Math.round(amountInBrl * 100) / 100;
  }
  if (toCode === "ARS") {
    return Math.round(amountInBrl * rateArs);
  }
  if (toCode === "USD") {
    return Math.round((amountInBrl / rateUsd) * 100) / 100;
  }

  return amountInBrl;
}

/**
 * Obtiene los equivalentes de un monto base en las 3 monedas.
 */
export function getCurrencyEquivalents(
  amount: number | string | null | undefined,
  baseCurrency: CurrencyCode | string = "ARS",
  rates?: ExchangeRates
): { BRL: number; ARS: number; USD: number } {
  const val = Number(amount) || 0;
  const base = (String(baseCurrency || "ARS").toUpperCase() as CurrencyCode) in CURRENCIES
    ? (String(baseCurrency || "ARS").toUpperCase() as CurrencyCode)
    : "ARS";
  const { rateArs, rateUsd } = extractRates(rates);

  let amountInBrl = val;
  if (base === "ARS") {
    amountInBrl = val / rateArs;
  } else if (base === "USD") {
    amountInBrl = val * rateUsd;
  }

  return {
    BRL: Math.round(amountInBrl * 100) / 100,
    ARS: Math.round(amountInBrl * rateArs),
    USD: Math.round((amountInBrl / rateUsd) * 100) / 100,
  };
}
