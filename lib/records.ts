import { supabase } from './supabase';

// Types
export type RecordType = 'negotiation' | 'memo';

export type Record = {
  id: string;
  type: RecordType;
  customer: string;
  contact?: string;
  project?: string;
  content: string;
  createdAt: string;
  audioUrl?: string;
  imageUrls?: string[];
};

// CREATE: Create a new record
export async function createRecord(record: Omit<Record, 'id'>): Promise<Record | null> {
  try {
    console.log('Creating record:', record);
    const { data, error } = await supabase
      .from('records')
      .insert([record])
      .select()
      .single();

    if (error) {
      console.error('Error creating record:', error);
      return null;
    }
    console.log('Record created:', data);
    return data;
  } catch (e) {
    console.error('Exception creating record:', e);
    return null;
  }
}

// READ: Get all records (with optional limit)
export async function getRecords(limit: number = 100): Promise<Record[]> {
  try {
    console.log('Fetching records...');
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching records:', error);
      return [];
    }
    console.log('Records fetched:', data?.length || 0, 'items');
    return data || [];
  } catch (e) {
    console.error('Exception fetching records:', e);
    return [];
  }
}

// READ: Get a single record by ID
export async function getRecordById(id: string): Promise<Record | null> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching record:', error);
      return null;
    }
    return data;
  } catch (e) {
    console.error('Exception fetching record:', e);
    return null;
  }
}

// UPDATE: Update a record
export async function updateRecord(id: string, updates: Partial<Omit<Record, 'id'>>): Promise<Record | null> {
  try {
    console.log('Updating record:', id, updates);
    const { data, error } = await supabase
      .from('records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating record:', error);
      return null;
    }
    console.log('Record updated:', data);
    return data;
  } catch (e) {
    console.error('Exception updating record:', e);
    return null;
  }
}

// DELETE: Delete a record
export async function deleteRecord(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('records')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting record:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception deleting record:', e);
    return false;
  }
}

// SEARCH: Search records by keyword
export async function searchRecords(query: string): Promise<Record[]> {
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .order('createdAt', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error searching records:', error);
      return [];
    }

    if (!data) return [];

    // Client-side filtering
    const searchLower = query.toLowerCase();
    return data.filter((record: Record) => {
      const customer = (record.customer || '').toLowerCase();
      const content = (record.content || '').toLowerCase();
      const project = (record.project || '').toLowerCase();
      return (
        customer.includes(searchLower) ||
        content.includes(searchLower) ||
        project.includes(searchLower)
      );
    });
  } catch (e) {
    console.error('Exception searching records:', e);
    return [];
  }
}
