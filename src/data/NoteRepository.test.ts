import { NoteRepository } from '@/data/NoteRepository';
import { Note } from '@/domain/Note';
import * as database from '@/data/database';

// Mock the database
jest.mock('@/data/database', () => ({
  getDB: jest.fn(),
}));

describe('NoteRepository', () => {
  let repo: NoteRepository;
  let mockDb: any;

  beforeEach(() => {
    repo = new NoteRepository();

    mockDb = {
      getAllAsync: jest.fn(),
      getFirstAsync: jest.fn(),
      runAsync: jest.fn(),
    };

    (database.getDB as jest.Mock).mockResolvedValue(mockDb);
  });

  it('should fetch notes successfully', async () => {
    const mockNotes = [
      {
        id: '1',
        title: 'Test Note',
        body: 'Body',
        tags: '["test"]',
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        sync_status: 'synced',
      },
    ];

    mockDb.getAllAsync.mockResolvedValue(mockNotes);

    const result = await repo.getNotes();

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Test Note');
    expect(result[0].tags).toEqual(['test']);
  });

  it('should create note successfully', async () => {
    const newNote: Note = {
      id: '2',
      title: 'New Note',
      body: 'New Body',
      tags: ['new'],
      createdAt: '2023-01-02',
      updatedAt: '2023-01-02',
      syncStatus: 'pending',
    };

    await repo.createNote(newNote);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notes'),
      expect.arrayContaining(['2', 'New Note', 'New Body'])
    );
  });
});
