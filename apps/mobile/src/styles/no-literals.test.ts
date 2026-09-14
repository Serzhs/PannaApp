import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const srcDir = join(__dirname, '..');
const tokensFile = join(srcDir, 'styles', 'tokens.ts');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry) ? [full] : [];
  });
}

const files = sourceFiles(srcDir).filter((file) => file !== tokensFile);

describe('raw values', () => {
  it.each(files.map((f) => [f.slice(srcDir.length), f]))(
    '%s contains no hex colour literal',
    (_label, file) => {
      const matches = /#[0-9a-fA-F]{3,8}\b/.exec(readFileSync(file, 'utf8'));
      expect(matches?.[0]).toBeUndefined();
    },
  );

  /**
   * A duration typed inline is a duration nobody can change globally, which is the
   * whole reason motion is tokenised alongside colour.
   */
  it.each(files.map((f) => [f.slice(srcDir.length), f]))(
    '%s takes durations from a token',
    (_label, file) => {
      const source = readFileSync(file, 'utf8');
      const matches =
        /\b(?:withTiming|withDelay|withRepeat|setTimeout)\(\s*[^,)]*,\s*\{?\s*duration:\s*\d/.exec(
          source,
        );
      expect(matches?.[0]).toBeUndefined();
    },
  );

  /**
   * The rule the design system stands on: spacing, radii and gaps name a token or they
   * are not consistent, whatever they happen to measure. `minHeight: 44` and friends are
   * deliberately not covered - that is a WCAG constant, not a spacing decision.
   */
  it.each(files.map((f) => [f.slice(srcDir.length), f]))(
    '%s takes spacing and radii from a token',
    (_label, file) => {
      const source = readFileSync(file, 'utf8');
      const offender =
        /\b(?:padding|paddingTop|paddingBottom|paddingLeft|paddingRight|paddingHorizontal|paddingVertical|margin|marginTop|marginBottom|marginLeft|marginRight|marginHorizontal|marginVertical|marginStart|marginEnd|paddingStart|paddingEnd|gap|rowGap|columnGap|borderRadius):\s*-?\d/.exec(
          source,
        );
      expect(offender?.[0]).toBeUndefined();
    },
  );
});
