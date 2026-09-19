import { describe, it, expect } from 'vitest';
import { getGenderThemeColors } from '../../components/theme/ThemeProvider';
import { DoodleArrow, DoodleSparkle, DoodleBadgeTape, DoodleSpeechBubble, DoodleUnderline } from '../../components/ui/DoodleStickers';

describe('Theme Functions', () => {
  it('resolves correct color classes for IKHWAN light mode', () => {
    const colors = getGenderThemeColors('IKHWAN', false);
    expect(colors).toContain('from-emerald-600');
    expect(colors).toContain('to-lime-500');
    expect(typeof colors).toBe('string');
  });

  it('resolves correct color classes for AKHWAT dark mode', () => {
    const colors = getGenderThemeColors('AKHWAT', true);
    expect(colors).toContain('from-teal-500');
    expect(colors).toContain('to-rose-400');
    expect(typeof colors).toBe('string');
  });
});

describe('DoodleStickers', () => {
  it('exports Doodle components correctly', () => {
    expect(DoodleArrow).toBeDefined();
    expect(DoodleSparkle).toBeDefined();
    expect(DoodleBadgeTape).toBeDefined();
    expect(DoodleSpeechBubble).toBeDefined();
    expect(DoodleUnderline).toBeDefined();
  });
});
