import { i18n } from './index';

/** Tests run in English regardless of the machine they run on. */
beforeAll(async () => {
  await i18n.changeLanguage('en');
});
