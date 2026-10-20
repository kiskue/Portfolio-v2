/** Types for encode.mjs. */
import type { Encoding } from './asset-plan.mjs';
import type { ImageType } from './image-bytes.mjs';

export declare function inspectImage(bytes: Buffer): Promise<{ type: ImageType; width: number; height: number }>;
export declare function encodeWebp(bytes: Buffer, encoding: Encoding): Promise<{ data: Buffer; width: number; height: number }>;
export declare function describeOutput(
  bytes: Buffer,
): Promise<{ format: string | undefined; width: number | undefined; height: number | undefined; hasMetadata: boolean }>;
