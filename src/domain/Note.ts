export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface Note {
  id: string; // UUID
  title: string;
  body: string;
  tags: string[];
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  syncStatus: SyncStatus;
}

export interface NoteFilter {
  searchQuery?: string;
  tag?: string;
}
