/** Types for manifest.mjs. */

export interface ManifestEntry {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  readonly sha256: string;
  readonly sourceUrl: string;
  readonly asOf: string;
}

export type Manifest = Record<string, ManifestEntry>;

export declare const MANIFEST_PATH: 'src/content/apps/store-assets.generated.json';
export declare const ENTRY_FIELDS: readonly ['src', 'width', 'height', 'bytes', 'sha256', 'sourceUrl', 'asOf'];

export declare function sha256Hex(bytes: Uint8Array): string;
export declare function compareKeys(a: string, b: string): -1 | 0 | 1;
/** Loosely typed entry input: validated at run time, so tests may pass invalid values. */
export type EntryInput = ManifestEntry | Readonly<Record<string, unknown>>;

/** Validates `fields` and returns them in the written order; throws on any invalid value. */
export declare function makeEntry(key: string, fields: EntryInput): ManifestEntry;
export declare function validateManifest(value: unknown): Manifest;
export declare function serializeManifest(entries: Readonly<Record<string, EntryInput>>): string;
