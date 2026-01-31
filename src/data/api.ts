import axios, { AxiosError } from 'axios';
import { Note } from '@/domain/Note';
import { CONFIG } from '@/config';
import { mockApi } from './mockApi';

const BASE_URL = 'https://interviewapi.czettapay.com/v1';
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const fetchNotes = async (): Promise<Note[]> => {
  if (CONFIG.USE_MOCK_API) {
    return mockApi.getNotes();
  }
  const response = await client.get<{ items: Note[] } | Note[]>('/notes');
  return response.data as Note[];
};

export const createNoteApi = async (note: Pick<Note, 'title' | 'body' | 'tags'>): Promise<Note> => {
  if (CONFIG.USE_MOCK_API) {
    return mockApi.createNote(note);
  }
  const response = await client.post<Note>('/notes', note);
  return response.data;
};

// Returns null if success, or the server Note if 409 Conflict
export const updateNoteApi = async (id: string, note: Pick<Note, 'title' | 'body' | 'tags' | 'updatedAt'>): Promise<Note | null> => {
  if (CONFIG.USE_MOCK_API) {
    return mockApi.updateNote(id, note);
  }
  try {
    await client.patch(`/notes/${id}`, note);
    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      return error.response.data as Note;
    }
    throw error;
  }
};

export const deleteNoteApi = async (id: string): Promise<void> => {
  if (CONFIG.USE_MOCK_API) {
    return mockApi.deleteNote(id);
  }
  await client.delete(`/notes/${id}`);
};
