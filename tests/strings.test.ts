import { afterEach, describe, expect, it, vi } from 'vitest';

import { getSavedLanguage, setLanguage, type LanguageCode } from '@/strings';

afterEach(() => vi.unstubAllGlobals());

describe('language preferences', () => {
  it.each(['constructor', '__proto__', 'toString', 'unknown'])('ignores invalid saved language %s', (saved) => {
    vi.stubGlobal('localStorage', { getItem: () => saved });
    vi.stubGlobal('navigator', { language: 'de-DE' });
    expect(getSavedLanguage()).toBe('de');
  });

  it('restores an explicitly supported locale', () => {
    vi.stubGlobal('localStorage', { getItem: () => 'fr' });
    expect(getSavedLanguage()).toBe('fr');
  });

  it('does not persist or reload for an unsupported requested language', () => {
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { setItem });
    setLanguage('constructor' as LanguageCode);
    expect(setItem).not.toHaveBeenCalled();
  });
});
