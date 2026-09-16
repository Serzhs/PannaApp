import { NAMESPACES, resources } from './resources';

import { i18n, resolveLocale, resolveUnitSystem } from './index';

describe('resolveLocale', () => {
  it('takes the explicit choice over the device', () => {
    expect(resolveLocale('en', ['lv-LV'])).toBe('en');
  });

  /** Null is not English: a Latvian phone with no choice made gets Latvian. */
  it('follows the device when nothing was chosen', () => {
    expect(resolveLocale(null, ['lv-LV', 'en-GB'])).toBe('lv');
  });

  it('falls back to English for a language the app does not ship', () => {
    expect(resolveLocale(null, ['de-DE'])).toBe('en');
    expect(resolveLocale(null, [])).toBe('en');
  });

  it('skips unshipped languages to reach a shipped one further down the list', () => {
    expect(resolveLocale(null, ['de-DE', 'lv'])).toBe('lv');
  });
});

describe('resolveUnitSystem', () => {
  it('takes the explicit choice over the device', () => {
    expect(resolveUnitSystem('metric', 'us')).toBe('metric');
  });

  it('derives imperial from a US device, and metric from anything else', () => {
    expect(resolveUnitSystem(null, 'us')).toBe('imperial');
    expect(resolveUnitSystem(null, 'uk')).toBe('metric');
    expect(resolveUnitSystem(null, 'metric')).toBe('metric');
    expect(resolveUnitSystem(null, null)).toBe('metric');
  });
});

describe('translations', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  /** The criterion: a key missing in Latvian renders the English text, never the key. */
  it('falls back to English for a key Latvian does not have yet', async () => {
    // A separate instance, so the probe strings cannot leak into the shipped resources.
    const probe = i18n.createInstance();
    await probe.init({
      resources: {
        en: { probe: { added: 'Only in English', blank: 'Blank in Latvian' } },
        lv: { probe: { blank: '' } },
      },
      lng: 'lv',
      fallbackLng: 'en',
      returnEmptyString: false,
    });
    expect(probe.t('probe:added')).toBe('Only in English');
    expect(probe.t('probe:blank')).toBe('Blank in Latvian');
  });

  it('translates a whole screen when the language is Latvian', async () => {
    await i18n.changeLanguage('lv');
    expect(i18n.t('recipes:list.empty.title')).toBe('Vēl nav recepšu');
    expect(i18n.t('recipes:servings', { count: 0 })).toBe('0 porciju');
    expect(i18n.t('recipes:servings', { count: 1 })).toBe('1 porcija');
    expect(i18n.t('recipes:servings', { count: 2 })).toBe('2 porcijas');
    expect(i18n.t('recipes:servings', { count: 10 })).toBe('10 porciju');
    expect(i18n.t('recipes:servings', { count: 21 })).toBe('21 porcija');
  });

  it('never renders a raw key', async () => {
    await i18n.changeLanguage('lv');
    for (const ns of NAMESPACES) {
      const keys = resources.en[ns];
      const walk = (prefix: string, value: unknown): void => {
        if (typeof value === 'string') {
          const key = `${ns}:${prefix}`.replace(/_(zero|one|other)$/, '');
          expect(i18n.t(key, { count: 2 })).not.toBe(key);
          return;
        }
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          walk(prefix === '' ? k : `${prefix}.${k}`, v);
        }
      };
      walk('', keys);
    }
  });

  it('lists every English key in the Latvian file, so nothing is forgotten', () => {
    const shape = (value: unknown): unknown =>
      typeof value === 'string'
        ? ''
        : Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
              .filter(([k]) => !k.endsWith('_zero'))
              .map(([k, v]) => [k, shape(v)]),
          );
    for (const ns of NAMESPACES) {
      expect(shape(resources.lv[ns])).toEqual(shape(resources.en[ns]));
    }
  });

  /**
   * The criterion: 0, 1, 2, 10 and 21 each pick the right Latvian form. Latvian's zero
   * form covers 0 and every number ending in 0, and its one form covers 21, which no
   * `n === 1` check gets right. The wording is the owner's to write; the category is
   * what this proves.
   */
  it.each([
    [0, 'zero'],
    [1, 'one'],
    [2, 'other'],
    [10, 'zero'],
    [21, 'one'],
  ])('picks the Latvian plural category for %i', (count, category) => {
    expect(new Intl.PluralRules('lv').select(count)).toBe(category);
  });

  it('formats interpolated numbers for the language', async () => {
    expect(i18n.t('recipes:servings', { count: 1 })).toBe('1 serving');
    expect(i18n.t('recipes:servings', { count: 4 })).toBe('4 servings');
    await i18n.changeLanguage('lv');
    expect(i18n.t('recipes:servings', { count: 4 })).toBe('4 porcijas');
  });
});
