import { describe, it, expect } from 'vitest';
import { generateThemes, getAllThemes, THEME_COLLECTIONS, CATEGORY_KEYS } from '../themes';

describe('generateThemes', () => {
  it('returns all 10 categories', () => {
    const themes = generateThemes();
    const expected = ['Neon', 'Dark', 'Light', 'Nature', 'Ocean', 'Space', 'Retro', 'Royal', 'Sunset', 'Tech'];
    expect(Object.keys(themes)).toEqual(expected);
  });

  it('each category has exactly 10 themes', () => {
    const themes = generateThemes();
    for (const cat of Object.keys(themes)) {
      expect(themes[cat]).toHaveLength(10);
    }
  });

  it('each theme has required fields', () => {
    const themes = generateThemes();
    const requiredFields = ['id', 'name', 'accent', 'bgMain', 'bgCard', 'bgSurface', 'border', 'textMain', 'textMuted'];
    for (const cat of Object.values(themes)) {
      for (const theme of cat) {
        for (const field of requiredFields) {
          expect(theme).toHaveProperty(field);
        }
      }
    }
  });

  it('theme ids are unique across all categories', () => {
    const themes = generateThemes();
    const ids = Object.values(themes).flat().map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('light themes use light text and white backgrounds', () => {
    const themes = generateThemes();
    for (const theme of themes.Light) {
      expect(theme.textMain).toBe('#09090b');
      expect(theme.bgCard).toBe('#ffffff');
    }
  });

  it('non-light themes use white text', () => {
    const themes = generateThemes();
    const nonLight = ['Neon', 'Dark', 'Nature', 'Ocean', 'Space', 'Retro', 'Royal', 'Sunset', 'Tech'];
    for (const cat of nonLight) {
      for (const theme of themes[cat]) {
        expect(theme.textMain).toBe('#ffffff');
      }
    }
  });

  it('Light category has dark accents', () => {
    const themes = generateThemes();
    for (const theme of themes.Light) {
      expect(theme.accent).not.toBe('#ffffff');
    }
  });

  it('each theme id follows category-name pattern', () => {
    const themes = generateThemes();
    for (const [cat, catThemes] of Object.entries(themes)) {
      for (const theme of catThemes) {
        expect(theme.id).toMatch(new RegExp(`^${cat.toLowerCase()}-`));
      }
    }
  });
});

describe('getAllThemes', () => {
  it('returns 100 themes', () => {
    expect(getAllThemes()).toHaveLength(100);
  });

  it('returns flat array of ThemeConfig objects', () => {
    const all = getAllThemes();
    expect(all.every(t => 'id' in t && 'name' in t && 'accent' in t)).toBe(true);
  });
});

describe('THEME_COLLECTIONS', () => {
  it('returns same result as generateThemes()', () => {
    expect(THEME_COLLECTIONS).toEqual(generateThemes());
  });
});

describe('CATEGORY_KEYS', () => {
  it('contains all 10 category keys', () => {
    expect(CATEGORY_KEYS).toHaveLength(10);
    expect(CATEGORY_KEYS).toContain('Neon');
    expect(CATEGORY_KEYS).toContain('Tech');
  });
});
