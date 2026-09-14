/**
 * The gallery is development-only, and the require sits in a module-level ternary so it
 * is dropped rather than merely skipped: Metro inlines `__DEV__` to false in a release
 * build, the ternary folds, and the gallery leaves the bundle. A function wrapper does
 * not fold, which is why this is written the awkward way. Checked by grepping an export.
 */
const galleryModule = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('@/features/design/DesignGallery') as { DesignGallery: React.ComponentType })
  : null;

export default function DesignRoute(): React.JSX.Element | null {
  if (!galleryModule) return null;
  const { DesignGallery } = galleryModule;
  return <DesignGallery />;
}
