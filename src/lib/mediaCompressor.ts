/**
 * Automatic Image Compression and Media Optimization Service
 * - Reduces image file size by up to 90% (5MB -> ~100KB)
 * - Automatically resizes high-resolution images to optimal web dimensions
 * - Saves network bandwidth, storage limits, and Firebase/Supabase quotas
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/webp' | 'image/jpeg' | 'image/png';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.75,
  format: 'image/webp'
};

/**
 * Compress an Image File or Blob
 */
export async function compressImageFile(
  file: File | Blob,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; base64: string; sizeKbBefore: number; sizeKbAfter: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sizeKbBefore = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let width = img.width;
      let height = img.height;

      // Scale down proportionally
      if (width > opts.maxWidth || height > opts.maxHeight) {
        if (width / height > opts.maxWidth / opts.maxHeight) {
          height = Math.round((height * opts.maxWidth) / width);
          width = opts.maxWidth;
        } else {
          width = Math.round((width * opts.maxHeight) / height);
          height = opts.maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      // Smooth rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Check canvas export format support (fallback to jpeg if webp unsupported)
      let exportFormat = opts.format;
      try {
        if (!canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
          exportFormat = 'image/jpeg';
        }
      } catch {
        exportFormat = 'image/jpeg';
      }

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Image compression failed'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;
            const sizeKbAfter = Math.round(blob.size / 1024);
            resolve({ blob, base64, sizeKbBefore, sizeKbAfter });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        exportFormat,
        opts.quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}

/**
 * Compress a Base64 Image string automatically
 */
export async function compressBase64Image(
  base64Str: string,
  options: CompressionOptions = {}
): Promise<string> {
  if (!base64Str || !base64Str.startsWith('data:image/')) {
    return base64Str; // Return as-is if not a compressible base64 image
  }

  // Skip if already small (less than 100KB)
  if (base64Str.length < 130000) {
    return base64Str;
  }

  try {
    const res = await fetch(base64Str);
    const blob = await res.blob();
    const compressed = await compressImageFile(blob, options);
    return compressed.base64;
  } catch (err) {
    console.warn('Base64 image auto-compression fallback:', err);
    return base64Str;
  }
}
