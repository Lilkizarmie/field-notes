import { getDB } from './database';
import { Note, NoteFilter } from '@/domain/Note';

export class NoteRepository {
  async getNotes(filter?: NoteFilter): Promise<Note[]> {
    const db = await getDB();
    let query = 'SELECT * FROM notes WHERE is_deleted = 0';
    const params: any[] = [];

    if (filter?.searchQuery) {
      query += ' AND (title LIKE ? OR body LIKE ? OR tags LIKE ?)';
      params.push(`%${filter.searchQuery}%`, `%${filter.searchQuery}%`, `%${filter.searchQuery}%`);
    }

    // Tag filtering needs to be done carefully since tags are JSON array
    // SQLite doesn't have great JSON array support without extensions, 
    // but for simple string match we can try LIKE or filter in JS.
    // Given the constraints, filtering in JS after fetch might be safer/easier if dataset is small.
    // However, let's try to do it in SQL if possible, or just append filter.

    query += ' ORDER BY updated_at DESC';

    const result = await db.getAllAsync(query, params) as any[];

    let notes = result.map(this.mapRowToNote);

    if (filter?.tag) {
      notes = notes.filter(n => n.tags.includes(filter.tag!));
    }

    return notes;
  }

  async getNoteById(id: string): Promise<Note | null> {
    const db = await getDB();
    const result = await db.getFirstAsync('SELECT * FROM notes WHERE id = ?', [id]) as any;
    return result ? this.mapRowToNote(result) : null;
  }

  // Internal helper to get raw row including sync fields
  async getRawNoteById(id: string): Promise<any | null> {
    const db = await getDB();
    return await db.getFirstAsync('SELECT * FROM notes WHERE id = ?', [id]);
  }

  async createNote(note: Note): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `INSERT INTO notes (id, title, body, tags, created_at, updated_at, sync_status, sync_action, is_deleted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        note.id,
        note.title,
        note.body,
        JSON.stringify(note.tags),
        note.createdAt,
        note.updatedAt,
        'pending',
        'create'
      ]
    );
  }

  async updateNote(note: Note): Promise<void> {
    const db = await getDB();
    // Logic: If it was 'create', keep 'create'. Else 'update'.
    await db.runAsync(
      `UPDATE notes 
       SET title = ?, body = ?, tags = ?, updated_at = ?, sync_status = 'pending',
           sync_action = CASE WHEN sync_action = 'create' THEN 'create' ELSE 'update' END
       WHERE id = ?`,
      [note.title, note.body, JSON.stringify(note.tags), note.updatedAt, note.id]
    );
  }

  async deleteNote(id: string): Promise<void> {
    const db = await getDB();
    const current = await this.getRawNoteById(id);
    if (!current) return;

    if (current.sync_action === 'create') {
      // It was never synced, just nuke it
      await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    } else {
      // Soft delete
      await db.runAsync(
        `UPDATE notes 
         SET is_deleted = 1, sync_status = 'pending', sync_action = 'delete', updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), id]
      );
    }
  }

  async getSyncableNotes(): Promise<any[]> {
    const db = await getDB();
    // Return raw rows so we see sync_action
    return await db.getAllAsync("SELECT * FROM notes WHERE sync_status IN ('pending', 'failed')");
  }

  async getPendingSyncNotes(): Promise<any[]> {
    const db = await getDB();
    // Return raw rows so we see sync_action
    return await db.getAllAsync('SELECT * FROM notes WHERE sync_status = ?', ['pending']);
  }

  async markSynced(id: string): Promise<void> {
    const db = await getDB();
    // If it was a soft delete and now synced, we can either keep it as tombstone or delete it.
    // For now, let's keep it but maybe it shouldn't pollute the DB forever. 
    // Requirement doesn't specify, but typically we hard delete after sync confirmation.

    // Check if it was a delete
    const current = await this.getRawNoteById(id);
    if (current && current.sync_action === 'delete') {
      await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    } else {
      await db.runAsync(
        `UPDATE notes SET sync_status = 'synced', sync_action = NULL WHERE id = ?`,
        [id]
      );
    }
  }

  async markFailed(id: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE notes SET sync_status = 'failed' WHERE id = ?`,
      [id]
    );
  }

  async replaceNoteId(oldId: string, newId: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE notes SET id = ? WHERE id = ?`,
      [newId, oldId]
    );
  }

  async updateSyncState(id: string, status: string, action: string): Promise<void> {
    const db = await getDB();
    await db.runAsync(
      `UPDATE notes SET sync_status = ?, sync_action = ? WHERE id = ?`,
      [status, action, id]
    );
  }

  private mapRowToNote(row: any): Note {
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      tags: JSON.parse(row.tags),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncStatus: row.sync_status as any,
    };
  }
}
