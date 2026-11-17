import {
  getSupabaseClient,
  isSupabaseConfigured,
  SUPABASE_STORAGE_BUCKETS,
} from '../lib/supabaseClient';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function randomShortId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 12);
}

export function readAndCompressImageAsDataUrl(file: File, maxDim = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const rawDataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        reject(new Error('Selected file did not contain valid image data.'));
        return;
      }

      if (typeof Image === 'undefined' || typeof document === 'undefined') {
        resolve(rawDataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const ratio = Math.min(maxDim / width, maxDim / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.onerror = () => resolve(rawDataUrl);
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

async function compressImageFileForUpload(
  file: File,
  maxDim = 1200,
  quality = 0.85
): Promise<{ blob: Blob; ext: 'jpg' | 'png' | 'webp'; contentType: string }> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Please upload a JPG, PNG, or WEBP image file.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image file must be under 5MB.');
  }

  if (typeof Image === 'undefined' || typeof document === 'undefined') {
    const fallbackExt =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    return { blob: file, ext: fallbackExt, contentType: file.type };
  }

  try {
    const dataUrl = await readAndCompressImageAsDataUrl(file, maxDim, quality);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const contentType = blob.type || 'image/jpeg';
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    return { blob, ext, contentType };
  } catch {
    const fallbackExt =
      file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    return { blob: file, ext: fallbackExt, contentType: file.type };
  }
}

export const supabaseStorageService = {
  /**
   * Uploads a product photo to the public `product-images` bucket when Supabase
   * is configured, or falls back to compressed data URL in local preview mode.
   */
  async uploadProductImage(file: File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error('Please choose a valid JPG, PNG, or WEBP image file.');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Product photo must be under 5MB.');
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      return readAndCompressImageAsDataUrl(file, 900, 0.82);
    }

    const { blob, ext, contentType } = await compressImageFileForUpload(file, 1200, 0.86);
    const objectPath = `catalogue/${Date.now()}_${randomShortId()}.${ext}`;

    const { error: uploadError } = await client.storage
      .from(SUPABASE_STORAGE_BUCKETS.PRODUCT_IMAGES)
      .upload(objectPath, blob, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Could not upload "${file.name}" to product-images storage: ${uploadError.message}`
      );
    }

    const { data } = client.storage
      .from(SUPABASE_STORAGE_BUCKETS.PRODUCT_IMAGES)
      .getPublicUrl(objectPath);

    if (!data?.publicUrl) {
      throw new Error('Image uploaded, but no public URL was returned by Supabase Storage.');
    }

    return data.publicUrl;
  },

  /**
   * Uploads a customer bespoke reference image into the strictly PRIVATE
   * `custom-references` bucket under `requests/...`.
   */
  async uploadCustomReferenceImage(
    file: File
  ): Promise<{ storagePath: string; fileName: string }> {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error('Please upload a valid JPG, PNG, or WEBP image file.');
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error('Reference image must be under 5MB.');
    }

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) {
      throw new Error('Supabase Storage is not configured.');
    }

    const { blob, ext, contentType } = await compressImageFileForUpload(file, 1000, 0.82);
    // Matches strict RLS regex: ^requests/[a-z0-9_-]+\.(jpg|jpeg|png|webp)$
    const objectPath = `requests/${Date.now()}_${randomShortId()}.${ext}`;

    const { error } = await client.storage
      .from(SUPABASE_STORAGE_BUCKETS.CUSTOM_REFERENCES)
      .upload(objectPath, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Could not upload reference image: ${error.message}`);
    }

    return {
      storagePath: objectPath,
      fileName: file.name,
    };
  },

  /**
   * Generates a temporary signed URL for a private custom reference image.
   * Succeeds only for authenticated administrators (or object owner) per Storage RLS.
   */
  async getSignedCustomReferenceUrls(
    storagePaths: string[]
  ): Promise<Record<string, string>> {
    const cleanPaths = Array.from(
      new Set(storagePaths.filter((p) => Boolean(p) && !p.startsWith('data:') && !p.startsWith('http')))
    );
    if (cleanPaths.length === 0) return {};

    const client = getSupabaseClient();
    if (!client || !isSupabaseConfigured()) return {};

    const { data, error } = await client.storage
      .from(SUPABASE_STORAGE_BUCKETS.CUSTOM_REFERENCES)
      .createSignedUrls(cleanPaths, 3600);

    if (error || !data) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const entry of data) {
      if (entry.path && entry.signedUrl) {
        result[entry.path] = entry.signedUrl;
      }
    }
    return result;
  },
};
