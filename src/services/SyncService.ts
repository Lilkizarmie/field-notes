import axios from 'axios';
import NetInfo from '@react-native-community/netinfo';
import { NoteRepository } from '@/data/NoteRepository';
import * as api from '@/data/api';
import { Note } from '@/domain/Note';

export type SyncResult = {
  status: 'success' | 'partial' | 'offline' | 'no-data';
  processed: number;
  failed: number;
};

export class SyncService {
  private repo: NoteRepository;
  private isSyncing = false;

  constructor() {
    this.repo = new NoteRepository();
  }

  async sync(): Promise<SyncResult> {
    if (this.isSyncing) return { status: 'no-data', processed: 0, failed: 0 };

    const state = await NetInfo.fetch();
    if (!state.isConnected) return { status: 'offline', processed: 0, failed: 0 };

    this.isSyncing = true;
    let processed = 0;
    let failed = 0;

    try {
      const result = await this.pushChanges();
      processed = result.processed;
      failed = result.failed;

      if (processed === 0 && failed === 0) return { status: 'no-data', processed, failed };
      if (failed > 0) return { status: 'partial', processed, failed };
      return { status: 'success', processed, failed };
    } catch (e) {
      console.error(e);
      // Even if main loop crashed, we might have processed some.
      return { status: 'partial', processed, failed };
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushChanges(): Promise<{ processed: number, failed: number }> {
    const notesToSync = await this.repo.getSyncableNotes();
    let processed = 0;
    let failed = 0;

    for (const rawNote of notesToSync) {
      let success = false;
      if (rawNote.is_deleted) {
        success = await this.handleDelete(rawNote);
      } else {
        if (rawNote.sync_action === 'create') {
          success = await this.handleCreate(rawNote);
        } else if (rawNote.sync_action === 'update') {
          success = await this.handleUpdate(rawNote);
        }
      }

      if (success) processed++;
      else failed++;
    }
    return { processed, failed };
  }

  private async handleCreate(rawNote: any): Promise<boolean> {
    try {
      // Tags need parsing if we use them from rawNote directly, 
      // but api expects array. rawNote.tags is string (json).
      const notePayload = {
        title: rawNote.title,
        body: rawNote.body,
        tags: JSON.parse(rawNote.tags),
      };

      const serverNote = await api.createNoteApi(notePayload);

      // Check if note was modified locally while syncing
      const freshNote = await this.repo.getRawNoteById(rawNote.id);
      if (!freshNote) return true; // Deleted?

      if (freshNote.updated_at !== rawNote.updated_at) {
        // Modified during sync. 
        // We must update the ID to match server, but keep it pending (update)
        await this.repo.replaceNoteId(rawNote.id, serverNote.id);
        // We leave sync_status='pending' and sync_action='create' -> wait.
        // Actually if we replace ID, future syncs will use new ID.
        // But what should the action be?
        // It was 'create' locally. Now it exists on server.
        // So next action should be 'update'.
        // We need to manually update the action to 'update'

        // Wait, how do we update the action if we don't have a direct method?
        // We can execute a specific query.
        await this.updateSyncState(serverNote.id, 'pending', 'update');
      } else {
        // Not modified. Success.
        await this.repo.replaceNoteId(rawNote.id, serverNote.id);
        await this.repo.markSynced(serverNote.id);
      }
      return true;

    } catch (error) {
      console.error('Create sync failed', error);
      await this.repo.markFailed(rawNote.id);
      return false;
    }
  }

  private async handleUpdate(rawNote: any): Promise<boolean> {
    try {
      const notePayload = {
        title: rawNote.title,
        body: rawNote.body,
        tags: JSON.parse(rawNote.tags),
        updatedAt: rawNote.updated_at // Send local update time for conflict check
      };

      // updateNoteApi returns null on success, or Server Note on conflict
      const result = await api.updateNoteApi(rawNote.id, notePayload);

      if (result) {
        // Conflict! Server wins.
        // Update local with server data.
        await this.repo.updateNote({
          ...result,
          syncStatus: 'synced' // It is now in sync with server
        });
        await this.repo.markSynced(rawNote.id);
      } else {
        // Success
        // Check for local modifications during sync
        const freshNote = await this.repo.getRawNoteById(rawNote.id);
        if (freshNote.updated_at !== rawNote.updated_at) {
          // Modified. Keep pending.
          return true; // Considered handled/processed, but still pending
        }
        await this.repo.markSynced(rawNote.id);
      }
      return true;
    } catch (error) {
      console.error('Update sync failed', error);
      // Check 404
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Note deleted on server?
        // We could recreate it (POST) or delete local.
        // Requirement: "If the API returns a 409...". Doesn't specify 404.
        // Usually 404 means we should probably re-create it or consider it deleted.
        // Let's mark failed for now so user can retry.
      }
      await this.repo.markFailed(rawNote.id);
      return false;
    }
  }

  private async handleDelete(rawNote: any): Promise<boolean> {
    try {
      await api.deleteNoteApi(rawNote.id);
      // Success, remove from DB or mark synced (which hard deletes if action is delete)
      await this.repo.markSynced(rawNote.id);
      return true;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        // Already deleted
        await this.repo.markSynced(rawNote.id);
        return true;
      }
      await this.repo.markFailed(rawNote.id);
      return false;
    }
  }

  // Helper to update state directly
  private async updateSyncState(id: string, status: string, action: string) {
    await this.repo.updateSyncState(id, status, action);
  }
}
