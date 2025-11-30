import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBalance(value: number, decimals: number = 18): string {
  if (value === 0) return "0";
  
  // If it's an integer or very close to integer → format with thousand separators
  if (Number.isInteger(value) || Math.abs(value - Math.round(value)) < 0.0001) {
    return Math.round(value).toLocaleString('en-US');
  }
  
  // If it's a small number (< 0.001) → show more decimals to keep precision
  if (value < 0.001) {
    // Find first significant digit position and keep 4 more digits after it
    const str = value.toFixed(18);
    let firstNonZero = 2; // after "0."
    while (str[firstNonZero] === '0' && firstNonZero < str.length) {
      firstNonZero++;
    }
    const significantDigits = firstNonZero - 2 + 4; // 4 significant digits
    return value.toFixed(Math.min(significantDigits, 18)).replace(/0+$/, '');
  }
  
  // Normal numbers → 4 decimals, remove trailing zeros
  return value.toFixed(4).replace(/\.?0+$/, '');
}
