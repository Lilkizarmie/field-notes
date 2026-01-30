import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation';
import { NoteRepository } from '@/data/NoteRepository';
import { Note } from '@/domain/Note';
import { COLORS, SPACING, FONTS } from '@/utils/theme';
import { SyncService } from '@/services/SyncService';

type NoteDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NoteDetail'>;
type NoteDetailScreenRouteProp = RouteProp<RootStackParamList, 'NoteDetail'>;

export const NoteDetailScreen = () => {
  const navigation = useNavigation<NoteDetailScreenNavigationProp>();
  const route = useRoute<NoteDetailScreenRouteProp>();
  const [note, setNote] = useState<Note | null>(null);
  const repo = new NoteRepository();
  const sync = new SyncService();

  useEffect(() => {
    loadNote();
    // Subscribe to focus to reload if edited, though param check might suffice
    const unsubscribe = navigation.addListener('focus', loadNote);
    return unsubscribe;
  }, [route.params.noteId]);

  const loadNote = async () => {
    const data = await repo.getNoteById(route.params.noteId);
    setNote(data);
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (note) {
              await repo.deleteNote(note.id);
              sync.sync().catch(console.error);
              navigation.goBack();
            }
          }
        },
      ]
    );
  };

  if (!note) {
    return (
      <View style={styles.center}>
        <Text>Loading or not found...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{note.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.date}>{new Date(note.updatedAt).toLocaleString()}</Text>
          <View style={[
            styles.badge,
            note.syncStatus === 'synced' ? styles.badgeSuccess :
              note.syncStatus === 'failed' ? styles.badgeError : styles.badgeWarning
          ]}>
            <Text style={styles.badgeText}>{note.syncStatus.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.tagsContainer}>
          {note.tags.map((tag, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.body}>{note.body}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.buttonText}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => navigation.navigate('CreateEditNote', { noteId: note.id })}
        >
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: SPACING.m,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.m,
    gap: SPACING.m,
  },
  date: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeSuccess: { backgroundColor: COLORS.success + '20' }, // 20% opacity
  badgeWarning: { backgroundColor: COLORS.warning + '20' },
  badgeError: { backgroundColor: COLORS.error + '20' },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.s,
    marginBottom: SPACING.l,
  },
  tag: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.m,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  body: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  footer: {
    flexDirection: 'row',
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: SPACING.m,
  },
  button: {
    flex: 1,
    padding: SPACING.m,
    borderRadius: 8,
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  editButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
});
