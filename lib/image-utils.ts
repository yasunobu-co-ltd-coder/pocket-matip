/**
 * Image utility functions for compression, resize, and EXIF removal
 */

// Configuration
export const IMAGE_CONFIG = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  maxDimension: 1280, // Max width or height in pixels
  quality: 0.85, // JPEG quality (0-1)
  allowedTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp'],
};

export type ImageProcessResult = {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  mimeType: string;
};

/**
 * Load image from File to HTMLImageElement
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = width / height;

  if (width > height) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / ratio),
    };
  } else {
    return {
      width: Math.round(maxDimension * ratio),
      height: maxDimension,
    };
  }
}

/**
 * Compress and resize image
 * Also removes EXIF data by re-encoding through canvas
 */
export async function processImage(
  file: File,
  options?: {
    maxDimension?: number;
    quality?: number;
  }
): Promise<ImageProcessResult> {
  const maxDimension = options?.maxDimension ?? IMAGE_CONFIG.maxDimension;
  const quality = options?.quality ?? IMAGE_CONFIG.quality;

  // Load image
  const img = await loadImage(file);

  // Calculate new dimensions
  const newDimensions = calculateDimensions(img.width, img.height, maxDimension);

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = newDimensions.width;
  canvas.height = newDimensions.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw image (this also strips EXIF data)
  ctx.drawImage(img, 0, 0, newDimensions.width, newDimensions.height);

  // Clean up object URL
  URL.revokeObjectURL(img.src);

  // Convert to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to convert canvas to blob'));
      },
      'image/jpeg',
      quality
    );
  });

  return {
    blob,
    width: newDimensions.width,
    height: newDimensions.height,
    originalSize: file.size,
    compressedSize: blob.size,
    mimeType: 'image/jpeg',
  };
}

/**
 * Validate file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
    const ext = file.name.toLowerCase().split('.').pop();
    const isValidExt = IMAGE_CONFIG.allowedExtensions.some((e) =>
      e.toLowerCase().endsWith(ext || '')
    );
    if (!isValidExt) {
      return {
        valid: false,
        error: `対応していないファイル形式です。対応形式: ${IMAGE_CONFIG.allowedExtensions.join(', ')}`,
      };
    }
  }

  // Check file size (before compression)
  if (file.size > IMAGE_CONFIG.maxSizeBytes * 2) {
    return {
      valid: false,
      error: `ファイルサイズが大きすぎます。最大: ${(IMAGE_CONFIG.maxSizeBytes * 2) / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * Generate unique filename for storage
 */
export function generateStoragePath(
  projectId: string,
  workDate: string,
  photoType: string,
  extension: string = 'jpg'
): string {
  const uuid = crypto.randomUUID();
  // Format: site-photos/{project_id}/{YYYY-MM-DD}/{photo_type}_{uuid}.{ext}
  return `${projectId}/${workDate}/${photoType}_${uuid}.${extension}`;
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || 'jpg';
}
