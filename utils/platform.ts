export interface ArgonParams {
  iterations: number;
  memorySize: number;
  parallelism: number;
}

export async function getArgonParams(): Promise<ArgonParams> {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  if (isTauri) {
    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile) {
      return { iterations: 3, memorySize: 65536, parallelism: 4 };
    }
  }
  return { iterations: 19, memorySize: 131072, parallelism: 4 };
}
