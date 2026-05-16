
import { ThemeCategory, ThemeConfig } from '../types';

// Simple color adjuster (lighten hex)
function adjustColor(color: string, amount: number) {
    return '#' + color.replace(/^#/, '').match(/.{2}/g)!.map(c => {
        let n = parseInt(c, 16) + amount;
        if(n > 255) n = 255; if(n < 0) n = 0;
        return n.toString(16).padStart(2, '0');
    }).join('');
}

// Helper to create a theme
const create = (cat: ThemeCategory, name: string, accent: string, bgBase: string, isLight = false): ThemeConfig => {
  return {
    id: `${cat.toLowerCase()}-${name.replace(/\s/g, '').toLowerCase()}`,
    name,
    accent,
    bgMain: bgBase,
    bgCard: isLight ? '#ffffff' : adjustColor(bgBase, 10),
    bgSurface: isLight ? '#f4f4f5' : adjustColor(bgBase, 20),
    border: isLight ? '#e4e4e7' : adjustColor(bgBase, 30),
    textMain: isLight ? '#09090b' : '#ffffff',
    textMuted: isLight ? '#71717a' : '#a1a1aa'
  };
};

export const generateThemes = (): Record<ThemeCategory, ThemeConfig[]> => {
  const categories: Record<ThemeCategory, ThemeConfig[]> = {
    Neon: [], Dark: [], Light: [], Nature: [], Ocean: [], Space: [], Retro: [], Royal: [], Sunset: [], Tech: []
  };

  // 1. NEON (10)
  const neons = ['#39ff14', '#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#00ff00', '#7df9ff', '#ff1493', '#ccff00', '#ff4500'];
  neons.forEach((c, i) => categories.Neon.push(create('Neon', `Neon ${i+1}`, c, '#000000')));

  // 2. DARK (10)
  const darks = ['#000000', '#0a0a0a', '#121212', '#18181b', '#0f172a', '#1c1917', '#020617', '#111827', '#171717', '#0c0a09'];
  darks.forEach((bg, i) => categories.Dark.push(create('Dark', `Onyx ${i+1}`, '#ffffff', bg)));

  // 3. LIGHT (10)
  const lights = ['#ffffff', '#fafafa', '#f5f5f5', '#f0f9ff', '#fff7ed', '#f0fdf4', '#fdf2f8', '#fafaf9', '#f8fafc', '#fff1f2'];
  const lightAccents = ['#000000', '#2563eb', '#dc2626', '#16a34a', '#d946ef', '#ea580c', '#0891b2', '#4f46e5', '#be123c', '#0f766e'];
  lights.forEach((bg, i) => categories.Light.push(create('Light', `Day ${i+1}`, lightAccents[i], bg, true)));

  // 4. NATURE (10)
  const natureBGs = ['#052e16', '#14532d', '#064e3b', '#134e4a', '#0f172a', '#3f2e3e', '#1a2e05', '#2e2e2e', '#1c1917', '#000000'];
  const natureAccents = ['#4ade80', '#86efac', '#2dd4bf', '#5eead4', '#fcd34d', '#bef264', '#a3e635', '#fde047', '#d9f99d', '#22c55e'];
  natureBGs.forEach((bg, i) => categories.Nature.push(create('Nature', `Flora ${i+1}`, natureAccents[i], bg)));

  // 5. OCEAN (10)
  const oceanBGs = ['#020617', '#082f49', '#0c4a6e', '#1e3a8a', '#172554', '#0f172a', '#0b1120', '#022c22', '#164e63', '#000000'];
  const oceanAccents = ['#38bdf8', '#0ea5e9', '#0284c7', '#7dd3fc', '#bae6fd', '#60a5fa', '#93c5fd', '#22d3ee', '#67e8f9', '#06b6d4'];
  oceanBGs.forEach((bg, i) => categories.Ocean.push(create('Ocean', `Depth ${i+1}`, oceanAccents[i], bg)));

  // 6. SPACE (10)
  const spaceBGs = ['#020617', '#2e1065', '#3b0764', '#1e1b4b', '#000000', '#111827', '#312e81', '#171717', '#0f172a', '#0a0a0a'];
  const spaceAccents = ['#c084fc', '#a855f7', '#d8b4fe', '#f0abfc', '#e879f9', '#818cf8', '#6366f1', '#a78bfa', '#c4b5fd', '#ddd6fe'];
  spaceBGs.forEach((bg, i) => categories.Space.push(create('Space', `Void ${i+1}`, spaceAccents[i], bg)));

  // 7. RETRO (10)
  const retroBGs = ['#2a0a18', '#1a0b2e', '#0f172a', '#271a3c', '#000000', '#1c1917', '#2e1065', '#1e293b', '#111827', '#312e81'];
  const retroAccents = ['#ff00ff', '#00ffff', '#ffff00', '#ff0055', '#7b61ff', '#ff9900', '#00ff99', '#ff00aa', '#bb00ff', '#00ccff'];
  retroBGs.forEach((bg, i) => categories.Retro.push(create('Retro', `Synth ${i+1}`, retroAccents[i], bg)));

  // 8. ROYAL (10)
  const royalBGs = ['#000000', '#1a0505', '#1e1b4b', '#171717', '#0f172a', '#271a0c', '#14080e', '#020617', '#0c0a09', '#18181b'];
  const royalAccents = ['#ffd700', '#eab308', '#facc15', '#fde047', '#c084fc', '#f472b6', '#fb7185', '#fbbf24', '#f59e0b', '#d97706'];
  royalBGs.forEach((bg, i) => categories.Royal.push(create('Royal', `Crown ${i+1}`, royalAccents[i], bg)));

  // 9. SUNSET (10)
  const sunsetBGs = ['#1a0505', '#2a0a0a', '#1f1208', '#1c1917', '#000000', '#18181b', '#0f172a', '#111827', '#0c0a09', '#171717'];
  const sunsetAccents = ['#f97316', '#fb923c', '#fdba74', '#fb7185', '#f43f5e', '#ef4444', '#f87171', '#fca5a5', '#fbbf24', '#f59e0b'];
  sunsetBGs.forEach((bg, i) => categories.Sunset.push(create('Sunset', `Dusk ${i+1}`, sunsetAccents[i], bg)));

  // 10. TECH (10)
  const techBGs = ['#000000', '#020617', '#052e16', '#022c22', '#0f172a', '#111827', '#171717', '#18181b', '#0c0a09', '#0a0a0a'];
  const techAccents = ['#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef'];
  techBGs.forEach((bg, i) => categories.Tech.push(create('Tech', `Cyber ${i+1}`, techAccents[i], bg)));

  return categories;
};

export const getAllThemes = (): ThemeConfig[] => {
  const all = generateThemes();
  return Object.values(all).flat();
};

export const THEME_COLLECTIONS = generateThemes();
export const CATEGORY_KEYS = Object.keys(THEME_COLLECTIONS) as ThemeCategory[];
