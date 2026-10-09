/** Installs an in-memory localStorage for bun test, so persistence is testable. */
if (typeof globalThis.localStorage === "undefined") {
  const map = new Map<string, string>();
  const shim = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", { value: shim });
}

export {};
