import type { LokalAppManifest, LokalCollections } from './types';

export function defineLokalApp<const Collections extends LokalCollections>(
  manifest: LokalAppManifest<Collections>,
): LokalAppManifest<Collections> {
  return manifest;
}
