import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const componentsDir = __dirname;

const folders = readdirSync(componentsDir).filter((entry) =>
  statSync(join(componentsDir, entry)).isDirectory(),
);

describe('component folders', () => {
  it('finds every component', () => {
    expect(folders.length).toBeGreaterThan(0);
  });

  /**
   * A component nobody can look at in isolation is not finished, per CLAUDE.md, and a
   * missing story is invisible until someone goes looking for it.
   */
  it.each(folders)('%s owns its component, styles, story, test and index', (folder) => {
    const files = readdirSync(join(componentsDir, folder));
    expect(files).toContain(`${folder}.tsx`);
    expect(files).toContain(`${folder}.styles.ts`);
    expect(files).toContain(`${folder}.stories.tsx`);
    expect(files).toContain(`${folder}.test.tsx`);
    expect(files).toContain('index.ts');
  });
});

describe('shared components directory', () => {
  it('has no barrel re-exporting everything', () => {
    expect(readdirSync(componentsDir)).not.toContain('index.ts');
  });
});
