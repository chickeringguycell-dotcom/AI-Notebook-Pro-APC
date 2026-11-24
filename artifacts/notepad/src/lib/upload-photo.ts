import { compressInlinePhotoToDataUrl } from "@/lib/sovereign-aether-runtime";

export interface UploadResult {
  url: string;
  objectPath: string;
}

export async function uploadPhoto(file: File): Promise<UploadResult> {
  const dataUrl = await compressInlinePhotoToDataUrl(file);
  return {
    url: dataUrl,
    objectPath: `local://${Date.now()}-${file.name}`,
  };
}
