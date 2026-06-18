declare module "jpeg-js" {
  export function decode(
    data: Uint8Array | ArrayBuffer,
    opts?: { useTArray?: boolean; formatAsRGBA?: boolean }
  ): { data: Uint8Array; width: number; height: number };
}
