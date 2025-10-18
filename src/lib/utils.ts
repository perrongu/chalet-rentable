import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)} %`;
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('fr-CA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ============================================================================
// UUID COMPATIBLE TOUS NAVIGATEURS
// ============================================================================

export function generateUUID(): string {
  // Utiliser crypto.randomUUID si disponible (navigateurs modernes)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback pour navigateurs plus anciens ou contextes non sécurisés
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ============================================================================
// DEEP CLONE COMPATIBLE
// ============================================================================

export function deepClone<T>(obj: T): T {
  // Utiliser structuredClone si disponible (navigateurs modernes)
  if (typeof structuredClone !== 'undefined') {
    return structuredClone(obj);
  }
  
  // Fallback pour navigateurs plus anciens
  // Note: Ne préserve pas les fonctions, mais suffit pour nos données
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================================
// DEBOUNCE
// ============================================================================

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// ============================================================================
// ESCAPE CSV RFC 4180
// ============================================================================

export function escapeCSVField(field: any): string {
  // Convertir en string
  const value = String(field ?? '');
  
  // Si le champ contient une virgule, un guillemet double, ou un retour à la ligne
  // il doit être encadré par des guillemets doubles
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    // Échapper les guillemets doubles en les doublant
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return value;
}

export function arrayToCSVLine(arr: any[]): string {
  return arr.map(escapeCSVField).join(',');
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

export function formatDate(date: Date | string, formatStr: string = 'PP'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, formatStr, { locale: fr });
}

export function formatDateShort(date: Date | string): string {
  return formatDate(date, 'dd/MM/yyyy');
}

export function formatDateLong(date: Date | string): string {
  return formatDate(date, 'PPP');
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'Pp');
}
