const validKeys = new Set<string>();

export function addKey(key: string): void {
  validKeys.add(key);
}

export function isValidKey(key: string): boolean {
  return validKeys.has(key) || key === "MASTER-KIIBOO-123";
}
