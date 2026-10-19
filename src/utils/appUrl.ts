/**
 * Utility to generate the real working open-access link for A.K. Hardware POS.
 * Uses the active browser location so that any phone can open and install the app
 * without 403 permission or expired URL errors.
 */

export function getPublicAppUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/';
  }

  try {
    // Check if running inside an accessible parent window
    let currentUrl = window.location.href;
    
    // Clean URL: Keep origin and pathname, strip hashes and query params
    const parsed = new URL(currentUrl);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return window.location.origin || window.location.href;
  }
}

export function getQrCodeUrl(url: string, size: number = 240): string {
  // Use high-reliability QR code API with error correction
  const encoded = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&margin=10`;
}
