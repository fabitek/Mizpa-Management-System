/**
 * Utility for formatting and detecting Colombian vehicle license plates.
 * 
 * Standard Colombian Formats:
 * - Car / Particular / Public: 3 letters + 3 digits -> 'ABC-123'
 * - Motorcycle: 3 letters + 2 digits + 1 letter -> 'ABC-12D'
 * - Classic / Diplomatic / Antique: 2 letters + 4 digits -> 'AB-1234'
 * - Official / Trailer: 1 letter + 4-5 digits -> 'R-12345'
 */

export type VehicleCategory = 'CAR' | 'MOTORCYCLE' | 'OTHER' | 'NONE';

/**
 * Normalizes and automatically formats a Colombian plate string with hyphen.
 * Handles typing live: e.g. "abc123" -> "ABC-123", "0av35e" -> "OAV-35E"
 */
export function formatColombianPlate(raw: string): string {
  if (!raw) return '';

  // 1. Remove spaces, hyphens, and non-alphanumeric characters, convert to uppercase
  let clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (clean.length === 0) return '';

  // 2. Auto-correct common OCR / user typo: leading '0' (zero) in place of 'O' in first 3 chars
  if (clean.length >= 1 && clean[0] === '0') clean = 'O' + clean.slice(1);
  if (clean.length >= 2 && clean[1] === '0' && /^[A-Z]/.test(clean[0])) clean = clean[0] + 'O' + clean.slice(2);
  if (clean.length >= 3 && clean[2] === '0' && /^[A-Z]{2}/.test(clean.slice(0, 2))) clean = clean.slice(0, 2) + 'O' + clean.slice(3);

  // 3. Format based on length and patterns

  // Motorcycle: 3 letters + 2 digits + 1 letter (e.g., ABC12D)
  if (/^[A-Z]{3}[0-9]{2}[A-Z]$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }

  // Car / Standard: 3 letters + 3 digits (e.g., ABC123)
  if (/^[A-Z]{3}[0-9]{3}$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }

  // Classic / Diplomatic: 2 letters + 4 digits (e.g., AB1234)
  if (/^[A-Z]{2}[0-9]{4}$/.test(clean)) {
    return `${clean.slice(0, 2)}-${clean.slice(2)}`;
  }

  // Dynamic typing formatting:
  // If first 3 chars are letters and length > 3:
  if (/^[A-Z]{3}/.test(clean) && clean.length > 3) {
    const letters = clean.slice(0, 3);
    const rest = clean.slice(3, 6); // Max 3 more chars
    return `${letters}-${rest}`;
  }

  // If first 2 chars are letters followed immediately by numbers:
  if (/^[A-Z]{2}[0-9]/.test(clean)) {
    const letters = clean.slice(0, 2);
    const rest = clean.slice(2, 6);
    return `${letters}-${rest}`;
  }

  return clean;
}

/**
 * Returns vehicle category based on plate structure.
 */
export function getVehicleCategory(plate?: string): VehicleCategory {
  if (!plate || !plate.trim()) return 'NONE';

  const clean = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Moto: 3 letters + 2 numbers + 1 letter (e.g. OAV35E)
  if (/^[A-Z]{3}[0-9]{2}[A-Z]$/.test(clean)) {
    return 'MOTORCYCLE';
  }

  // Car: 3 letters + 3 numbers (e.g. ESM514)
  if (/^[A-Z]{3}[0-9]{3}$/.test(clean)) {
    return 'CAR';
  }

  // Classic / 2 letters + 4 digits
  if (/^[A-Z]{2}[0-9]{4}$/.test(clean)) {
    return 'CAR';
  }

  return 'OTHER';
}

/**
 * Returns the appropriate vehicle emoji (🚗 or 🏍️).
 */
export function getVehicleIcon(plate?: string): string {
  const category = getVehicleCategory(plate);
  switch (category) {
    case 'MOTORCYCLE':
      return '🏍️';
    case 'CAR':
      return '🚗';
    case 'OTHER':
      return '🚘';
    default:
      return '🚗';
  }
}

/**
 * Returns a human readable label for the plate with vehicle emoji.
 * e.g. "🚗 ESM-514" or "🏍️ OAV-35E"
 */
export function formatPlateBadge(plate?: string): string {
  if (!plate || !plate.trim()) return '';
  const formatted = formatColombianPlate(plate);
  const icon = getVehicleIcon(formatted);
  return `${icon} ${formatted}`;
}
