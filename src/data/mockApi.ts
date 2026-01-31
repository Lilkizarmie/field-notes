import { Note } from '@/domain/Note';

// Simple in-memory mock server
let mockStore: Note[] = [];

// Latency simulator
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockApi = {
  getNotes: async (): Promise<Note[]> => {
    await delay(500);
    return [...mockStore];
  },

  createNote: async (note: Pick<Note, 'title' | 'body' | 'tags'>): Promise<Note> => {
    await delay(500);
    const newNote: Note = {
      id: Math.random().toString(36).substring(7), // Server-side ID generation simulation
      title: note.title,
      body: note.body,
      tags: note.tags,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced'
    };
    mockStore.push(newNote);
    return newNote;
  },

  updateNote: async (id: string, updates: any): Promise<Note | null> => {
    await delay(500);
    const index = mockStore.findIndex(n => n.id === id);
    if (index === -1) {
      // Simulate 404 or just ignore
      return null;
    }

    // Simulate Conflict (409) logic if needed
    // For now, simple success
    const updatedNote = {
      ...mockStore[index],
      ...updates,
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced' // Server version doesn't have syncStatus but our domain does
    };
    mockStore[index] = updatedNote as Note;
    return null; // Success returns null in our contract
  },

  deleteNote: async (id: string): Promise<void> => {
    await delay(500);
    mockStore = mockStore.filter(n => n.id !== id);
  }
};
