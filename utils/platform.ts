export interface ArgonParams {
  iterations: number;
  memorySize: number;
  parallelism: number;
}

export type ArgonPurpose = 'master' | 'recovery';

export async function getArgonParams(purpose: ArgonPurpose = 'master'): Promise<ArgonParams> {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  if (isTauri) {
    const isMobile = typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile) {
      switch (purpose) {
        case 'recovery': return { iterations: 2, memorySize: 65536, parallelism: 4 };
        default: return { iterations: 3, memorySize: 65536, parallelism: 4 };
      }
    }
  }
  switch (purpose) {
    case 'recovery': return { iterations: 10, memorySize: 131072, parallelism: 4 };
    default: return { iterations: 19, memorySize: 131072, parallelism: 4 };
  }
}
