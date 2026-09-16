import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const componentsDir = __dirname;

const folders = readdirSync(componentsDir).filter((entry) =>
  statSync(join(componentsDir, entry)).isDirectory(),
);

/**
 * 0004: ConfirmDialog wraps the platform's own alert and draws nothing, so it has no
 * styles to own. Every other component has a styles file or it is missing one.
 */
const STYLELESS = ['ConfirmDialog'];

describe('component folders', () => {
  it('finds every component', () => {
    expect(folders.length).toBeGreaterThan(0);
  });

  it.each(folders)('%s owns its component, styles, test and index', (folder) => {
    const files = readdirSync(join(componentsDir, folder));
    expect(files).toContain(`${folder}.tsx`);
    if (!STYLELESS.includes(folder)) expect(files).toContain(`${folder}.styles.ts`);
    expect(files).toContain(`${folder}.test.tsx`);
    expect(files).toContain('index.ts');
  });
});

describe('shared components directory', () => {
  it('has no barrel re-exporting everything', () => {
    expect(readdirSync(componentsDir)).not.toContain('index.ts');
  });
});
