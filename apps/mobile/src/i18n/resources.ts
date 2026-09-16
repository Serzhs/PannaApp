import enAuth from './en/auth.json';
import enCommon from './en/common.json';
import enRecipes from './en/recipes.json';
import enSettings from './en/settings.json';
import enUnits from './en/units.json';
import lvAuth from './lv/auth.json';
import lvCommon from './lv/common.json';
import lvRecipes from './lv/recipes.json';
import lvSettings from './lv/settings.json';
import lvUnits from './lv/units.json';

/** One namespace per feature, matching `src/features/*`, plus `common` for shared components. */
export const resources = {
  en: { common: enCommon, auth: enAuth, recipes: enRecipes, settings: enSettings, units: enUnits },
  lv: { common: lvCommon, auth: lvAuth, recipes: lvRecipes, settings: lvSettings, units: lvUnits },
} as const;

export const NAMESPACES = ['common', 'auth', 'recipes', 'settings', 'units'] as const;
