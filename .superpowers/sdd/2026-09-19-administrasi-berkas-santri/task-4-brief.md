# Task 4 Brief: UI Design Tokens, Dark/Light Theme & SVG Doodle Stickers

## Files
- Create: `components/theme/ThemeProvider.tsx`
- Create: `components/theme/ThemeToggle.tsx`
- Create: `components/ui/DoodleStickers.tsx`
- Test: `tests/ui/theme.test.ts`

## Requirements
1. **Theme Provider (`components/theme/ThemeProvider.tsx`)**:
   - Client component (`'use client'`).
   - Context providing:
     - `theme: 'light' | 'dark'` (persists in `localStorage`, updates `<html class="dark">`).
     - `toggleTheme(): void`
     - `setTheme(theme: 'light' | 'dark'): void`
     - `genderTheme: 'IKHWAN' | 'AKHWAT'`
     - `setGenderTheme(gender: 'IKHWAN' | 'AKHWAT'): void`
   - Custom hook: `useTheme()`
   - Color classes helper: `getGenderThemeColors(genderTheme, isDark)` returning tailored gradient and accent classes (Emerald Teal + Citron Lime for Ikhwan; Mint Teal + Dusty Coral for Akhwat).

2. **Theme Toggle Button (`components/theme/ThemeToggle.tsx`)**:
   - Client component.
   - Elegant soft pill / claymorphism button using Phosphor Icons (`Sun` and `Moon` with `weight="duotone"`).
   - Shows active theme indicator with smooth transition.

3. **Handcrafted SVG Doodle Stickers (`components/ui/DoodleStickers.tsx`)**:
   - Visual personality components matching reference images (Playful, Islamic Organic, Anti-Slop):
     - `<DoodleArrow className="" direction="right" | "left" | "down" />` (hand-drawn sketchy arrow)
     - `<DoodleSparkle className="" size={24} />` (4-pointed hand-drawn star sparkle)
     - `<DoodleBadgeTape className="" text="Terverifikasi" />` (washi-tape style badge with handwritten text)
     - `<DoodleSpeechBubble text="Hello!" className="" />` (speech bubble badge with Caveat handwriting font)
     - `<DoodleUnderline className="" />` (hand-drawn marker/brush squiggly underline)

4. **Integration with `app/layout.tsx`**:
   - Wrap children with `<ThemeProvider>` so theme is active across all pages.

5. **Tests (`tests/ui/theme.test.ts`)**:
   - Tests validating theme default state, color helper resolution for Ikhwan and Akhwat in both light and dark modes, and doodle render helpers.
   - Verify `npm test` runs and all test suites pass.
