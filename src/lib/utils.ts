import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { PaymentFrequency } from "../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  const formatted = new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  // Remplacer l'espace normal par un espace insécable
  return formatted.replace(" $", "\u00A0$");
}

export function formatCurrencySigned(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return value < 0 ? `(${formatted})` : formatted;
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)} %`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat("fr-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ============================================================================
// UUID COMPATIBLE TOUS NAVIGATEURS
// ============================================================================

export function generateUUID(): string {
  // Utiliser crypto.randomUUID si disponible (navigateurs modernes)
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback sécurisé avec crypto.getRandomValues
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// ============================================================================
// DEEP CLONE COMPATIBLE
// ============================================================================

export function deepClone<T>(obj: T): T {
  // Utiliser structuredClone si disponible (navigateurs modernes)
  if (typeof structuredClone !== "undefined") {
    return structuredClone(obj);
  }

  // Fallback pour navigateurs plus anciens
  // Note: Ne préserve pas les fonctions, mais suffit pour nos données
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// DEEP MERGE
// ============================================================================

export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    // Bloquer les clés dangereuses (prototype pollution)
    if (key === "__proto__" || key === "constructor" || key === "prototype")
      continue;

    const sourceValue = source[key as keyof T];
    const targetValue = result[key as keyof T];

    // Si les deux valeurs sont des objets (et pas des arrays ou null), merger récursivement
    if (
      sourceValue &&
      typeof sourceValue === "object" &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === "object" &&
      !Array.isArray(targetValue)
    ) {
      result[key as keyof T] = deepMerge(
        targetValue as Record<string, unknown> & object,
        sourceValue as Partial<Record<string, unknown> & object>,
      ) as T[keyof T];
    } else {
      result[key as keyof T] = sourceValue as T[keyof T];
    }
  }

  return result;
}

// ============================================================================
// DEBOUNCE
// ============================================================================

export function debounce<T extends unknown[]>(
  func: (...args: T) => void,
  wait: number,
): (...args: T) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: T) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

// ============================================================================
// FRÉQUENCES DE PAIEMENT
// ============================================================================

export function getPaymentsPerYear(
  frequency: PaymentFrequency | string,
): number {
  switch (frequency) {
    case "MONTHLY":
      return 12;
    case "BI_WEEKLY":
      return 26;
    case "WEEKLY":
      return 52;
    case "ANNUAL":
      return 1;
    default:
      return 12;
  }
}

// ============================================================================
// ARRONDI NUMÉRIQUE
// ============================================================================

export function round(value: number, decimals: number = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

function formatDate(date: Date | string, formatStr: string = "PP"): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: fr });
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, "dd/MM/yyyy");
}
