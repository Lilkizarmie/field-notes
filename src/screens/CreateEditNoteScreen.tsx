import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation';
import { NoteRepository } from '@/data/NoteRepository';
import { Note } from '@/domain/Note';
import { COLORS, SPACING, FONTS } from '@/utils/theme';
import { v4 as uuidv4 } from 'uuid';
import { SyncService } from '@/services/SyncService';

type CreateEditNoteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CreateEditNote'>;
type CreateEditNoteScreenRouteProp = RouteProp<RootStackParamList, 'CreateEditNote'>;

export const CreateEditNoteScreen = () => {
  const navigation = useNavigation<CreateEditNoteScreenNavigationProp>();
  const route = useRoute<CreateEditNoteScreenRouteProp>();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [loading, setLoading] = useState(false);
  const repo = new NoteRepository();
  const sync = new SyncService();

  useEffect(() => {
    if (route.params.noteId) {
      loadNote(route.params.noteId);
    }
  }, [route.params.noteId]);

  const loadNote = async (id: string) => {
    const note = await repo.getNoteById(id);
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setTags(note.tags.join(', '));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setLoading(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      const now = new Date().toISOString();

      if (route.params.noteId) {
        // Edit
        const note = await repo.getNoteById(route.params.noteId);
        if (note) {
          const updatedNote: Note = {
            ...note,
            title,
            body,
            tags: tagList,
            updatedAt: now,
            syncStatus: 'pending' // Re-mark as pending
          };
          await repo.updateNote(updatedNote);
        }
      } else {
        // Create
        const newNote: Note = {
          id: uuidv4(),
          title,
          body,
          tags: tagList,
          createdAt: now,
          updatedAt: now,
          syncStatus: 'pending'
        };
        await repo.createNote(newNote);
      }

      // Try to sync immediately (optimistic)
      sync.sync().catch(console.error);

      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Enter title"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          style={styles.input}
          value={tags}
          onChangeText={setTags}
          placeholder="e.g. work, ideas, important"
        />
      </View>

      <View style={[styles.formGroup, { flex: 1 }]}>
        <Text style={styles.label}>Body</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={body}
          onChangeText={setBody}
          placeholder="Write your note here..."
          multiline
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>{loading ? 'Saving...' : 'Save Note'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.m,
  },
  formGroup: {
    marginBottom: SPACING.m,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  input: {
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  textArea: {
    minHeight: 200,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.m,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  saveButtonText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
});
