export function encodeToken(token: string): string {
  return btoa(token);
}

export function decodeToken(encodedToken: string): string | null {
  try {
    return atob(encodedToken);
  } catch {
    return null;
  }
}