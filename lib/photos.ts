import { supabase } from './supabase';

// Types
export type PhotoType = 'before' | 'after' | 'issue' | 'other';

export type Photo = {
  id: string;
  project_id: string;
  work_date: string;
  photo_type: PhotoType;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  description?: string;
  uploaded_by?: string;
  created_at: string;
  updated_at?: string;
};

export type PhotoInsert = Omit<Photo, 'id' | 'created_at' | 'updated_at'>;

export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  before: '施工前',
  after: '施工後',
  issue: '問題箇所',
  other: 'その他',
};

const STORAGE_BUCKET = 'site-photos';

// ============================================
// Storage Operations
// ============================================

/**
 * Upload image to Supabase Storage
 */
export async function uploadPhoto(
  storagePath: string,
  file: Blob,
  contentType: string
): Promise<{ path: string; error: Error | null }> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        contentType,
        upsert: false,
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { path: '', error: new Error(error.message) };
    }

    return { path: data.path, error: null };
  } catch (e) {
    console.error('Storage upload exception:', e);
    return { path: '', error: e as Error };
  }
}

/**
 * Delete image from Supabase Storage
 */
export async function deletePhotoFromStorage(storagePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Storage delete exception:', e);
    return false;
  }
}

/**
 * Get signed URL for photo (valid for specified seconds)
 */
export async function getSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      return null;
    }

    return data.signedUrl;
  } catch (e) {
    console.error('Signed URL exception:', e);
    return null;
  }
}

/**
 * Get signed URLs for multiple photos
 */
export async function getSignedUrls(
  storagePaths: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(storagePaths, expiresIn);

    if (error) {
      console.error('Signed URLs error:', error);
      return urlMap;
    }

    data?.forEach((item) => {
      if (item.signedUrl && item.path) {
        urlMap.set(item.path, item.signedUrl);
      }
    });

    return urlMap;
  } catch (e) {
    console.error('Signed URLs exception:', e);
    return urlMap;
  }
}

// ============================================
// Database Operations
// ============================================

/**
 * Create photo record in database
 */
export async function createPhotoRecord(photo: PhotoInsert): Promise<Photo | null> {
  try {
    const { data, error } = await supabase.from('photos').insert([photo]).select().single();

    if (error) {
      console.error('Create photo record error:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Create photo record exception:', e);
    return null;
  }
}

/**
 * Get photos with filters
 */
export async function getPhotos(filters?: {
  project_id?: string;
  work_date_from?: string;
  work_date_to?: string;
  photo_type?: PhotoType;
  limit?: number;
}): Promise<Photo[]> {
  try {
    let query = supabase.from('photos').select('*').order('created_at', { ascending: false });

    if (filters?.project_id) {
      query = query.eq('project_id', filters.project_id);
    }

    if (filters?.work_date_from) {
      query = query.gte('work_date', filters.work_date_from);
    }

    if (filters?.work_date_to) {
      query = query.lte('work_date', filters.work_date_to);
    }

    if (filters?.photo_type) {
      query = query.eq('photo_type', filters.photo_type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get photos error:', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Get photos exception:', e);
    return [];
  }
}

/**
 * Get single photo by ID
 */
export async function getPhotoById(id: string): Promise<Photo | null> {
  try {
    const { data, error } = await supabase.from('photos').select('*').eq('id', id).single();

    if (error) {
      console.error('Get photo by ID error:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Get photo by ID exception:', e);
    return null;
  }
}

/**
 * Update photo record
 */
export async function updatePhotoRecord(
  id: string,
  updates: Partial<Omit<Photo, 'id' | 'storage_path' | 'created_at'>>
): Promise<Photo | null> {
  try {
    const { data, error } = await supabase
      .from('photos')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update photo record error:', error);
      return null;
    }

    return data;
  } catch (e) {
    console.error('Update photo record exception:', e);
    return null;
  }
}

/**
 * Delete photo (both database record and storage)
 */
export async function deletePhoto(id: string): Promise<boolean> {
  try {
    // First get the photo to get storage path
    const photo = await getPhotoById(id);
    if (!photo) {
      console.error('Photo not found for deletion:', id);
      return false;
    }

    // Delete from storage first
    const storageDeleted = await deletePhotoFromStorage(photo.storage_path);
    if (!storageDeleted) {
      console.warn('Failed to delete from storage, continuing with DB deletion');
    }

    // Then delete from database
    const { error } = await supabase.from('photos').delete().eq('id', id);

    if (error) {
      console.error('Delete photo record error:', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Delete photo exception:', e);
    return false;
  }
}

// ============================================
// CSV Export
// ============================================

export type PhotoCSVRow = {
  project_id: string;
  work_date: string;
  photo_type: string;
  photo_type_label: string;
  file_name: string;
  storage_path: string;
  signed_url?: string;
  size_bytes: number;
  size_formatted: string;
  description: string;
  created_at: string;
  uploaded_by: string;
};

/**
 * Generate CSV data for photos
 */
export async function generatePhotosCSV(
  photos: Photo[],
  includeSignedUrls: boolean = false
): Promise<string> {
  // Get signed URLs if requested
  let urlMap = new Map<string, string>();
  if (includeSignedUrls && photos.length > 0) {
    const paths = photos.map((p) => p.storage_path);
    urlMap = await getSignedUrls(paths, 86400); // 24 hour validity
  }

  // CSV Header
  const headers = [
    'project_id',
    'work_date',
    'photo_type',
    'photo_type_label',
    'file_name',
    'storage_path',
    ...(includeSignedUrls ? ['signed_url'] : []),
    'size_bytes',
    'size_formatted',
    'description',
    'created_at',
    'uploaded_by',
  ];

  // Format bytes helper
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Escape CSV field
  const escapeCSV = (field: string | number | undefined): string => {
    if (field === undefined || field === null) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV rows
  const rows = photos.map((photo) => {
    const values = [
      escapeCSV(photo.project_id),
      escapeCSV(photo.work_date),
      escapeCSV(photo.photo_type),
      escapeCSV(PHOTO_TYPE_LABELS[photo.photo_type]),
      escapeCSV(photo.file_name),
      escapeCSV(photo.storage_path),
      ...(includeSignedUrls ? [escapeCSV(urlMap.get(photo.storage_path) || '')] : []),
      escapeCSV(photo.size_bytes),
      escapeCSV(formatBytes(photo.size_bytes)),
      escapeCSV(photo.description || ''),
      escapeCSV(photo.created_at),
      escapeCSV(photo.uploaded_by || ''),
    ];
    return values.join(',');
  });

  // Add BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  return BOM + headers.join(',') + '\n' + rows.join('\n');
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
