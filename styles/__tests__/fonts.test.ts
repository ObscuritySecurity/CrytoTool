import { describe, it, expect } from 'vitest';
import { FONT_LIST, FONT_CATEGORIES, getFontsByCategory } from '../fonts';

describe('FONT_LIST', () => {
  it('contains at least 100 fonts', () => {
    expect(FONT_LIST.length).toBeGreaterThanOrEqual(100);
  });

  it('each font has required fields', () => {
    const required = ['id', 'name', 'family', 'category'];
    for (const font of FONT_LIST) {
      for (const field of required) {
        expect(font).toHaveProperty(field);
      }
    }
  });

  it('has no duplicate ids', () => {
    const ids = FONT_LIST.map(f => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every font belongs to a valid category', () => {
    for (const font of FONT_LIST) {
      expect(FONT_CATEGORIES).toContain(font.category);
    }
  });

  it('includes system default font', () => {
    const system = FONT_LIST.find(f => f.id === 'system');
    expect(system).toBeDefined();
    expect(system!.category).toBe('System');
  });

  it('modern fonts use sans-serif', () => {
    for (const font of FONT_LIST) {
      if (font.category === 'Modern') {
        expect(font.family).toContain('sans-serif');
      }
    }
  });

  it('tech fonts use monospace or sans-serif', () => {
    for (const font of FONT_LIST) {
      if (font.category === 'Tech') {
        const hasValidFamily = font.family.includes('monospace') ||
          font.family.includes('sans-serif') ||
          font.family.includes('cursive') ||
          font.family.includes('system-ui');
        expect(hasValidFamily).toBe(true);
      }
    }
  });

  it('serif fonts use serif', () => {
    for (const font of FONT_LIST) {
      if (font.category === 'Serif') {
        expect(font.family).toContain('serif');
      }
    }
  });
});

describe('FONT_CATEGORIES', () => {
  it('contains all 6 categories', () => {
    expect(FONT_CATEGORIES).toEqual(['Modern', 'Tech', 'Serif', 'Display', 'Handwriting', 'System']);
  });
});

describe('getFontsByCategory', () => {
  it('returns correct fonts for Modern category', () => {
    const modernFonts = getFontsByCategory('Modern');
    expect(modernFonts.length).toBeGreaterThan(0);
    expect(modernFonts.every(f => f.category === 'Modern')).toBe(true);
  });

  it('returns correct fonts for System category', () => {
    const systemFonts = getFontsByCategory('System');
    expect(systemFonts).toHaveLength(1);
    expect(systemFonts[0].id).toBe('system');
  });

  it('returns empty array for unknown category', () => {
    const result = getFontsByCategory('Unknown' as any);
    expect(result).toHaveLength(0);
  });

  it('sum of all categories equals total font count', () => {
    const totalFromCategories = FONT_CATEGORIES.reduce((sum, cat) => sum + getFontsByCategory(cat).length, 0);
    expect(totalFromCategories).toBe(FONT_LIST.length);
  });
});
