import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation';
import { NoteRepository } from '@/data/NoteRepository';
import { Note } from '@/domain/Note';
import { COLORS, SPACING, FONTS, SHADOWS } from '@/utils/theme';
import { SyncService } from '@/services/SyncService';
import { showError, showSuccess } from '@/utils/helperFunction';

type NotesListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NotesList'>;

export const NotesListScreen = () => {
  const navigation = useNavigation<NotesListScreenNavigationProp>();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const repo = new NoteRepository();
  const syncService = new SyncService();

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await repo.getNotes({ searchQuery });
      setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncService.sync();

      switch (result.status) {
        case 'success':
          showSuccess(`Synced ${result.processed} notes successfully.`);
          break;
        case 'partial':
          showError(`Synced ${result.processed} notes. Failed: ${result.failed}.`);
          break;
        case 'offline':
          showError('No internet connection. Please try again later.');
          break;
        case 'no-data':
          showSuccess('All notes are up to date.');
          break;
      }
    } catch (e) {
      showError('An unexpected error occurred during sync.');
    } finally {
      setIsSyncing(false);
      loadNotes(); // Reload to see if IDs changed or sync status updated
    }
  };

  const renderItem = ({ item }: { item: Note }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('NoteDetail', { noteId: item.id })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        <SyncStatusIndicator status={item.syncStatus} />
      </View>
      <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
      <View style={styles.tagsContainer}>
        {item.tags.map((tag, idx) => (
          <View key={idx} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={handleSync} style={styles.syncButton} disabled={isSyncing}>
          {isSyncing ? <ActivityIndicator color={COLORS.surface} size="small" /> : <Text style={styles.syncButtonText}>Sync</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No notes found. Create one!</Text>}
          refreshControl={
            <RefreshControl
              refreshing={isSyncing}
              onRefresh={handleSync}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateEditNote', {})}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const SyncStatusIndicator = ({ status }: { status: string }) => {
  let color = COLORS.textSecondary;
  let label = '';

  switch (status) {
    case 'synced': color = COLORS.success; label = '✓'; break;
    case 'pending': color = COLORS.warning; label = '⟳'; break;
    case 'failed': color = COLORS.error; label = '!'; break;
  }

  return (
    <Text style={[styles.syncStatus, { color }]}>{label}</Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: SPACING.m,
    gap: SPACING.s,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  syncButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    justifyContent: 'center',
    borderRadius: 8,
  },
  syncButtonText: {
    color: COLORS.surface,
    fontWeight: '600',
  },
  list: {
    padding: SPACING.m,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.m,
    marginBottom: SPACING.m,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  body: {
    color: COLORS.textSecondary,
    marginBottom: SPACING.s,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  tag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.s,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  syncStatus: {
    fontSize: 14,
    fontWeight: '900',
    marginLeft: SPACING.s,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: SPACING.xl,
    color: COLORS.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: SPACING.l,
    bottom: SPACING.l,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  fabText: {
    color: COLORS.surface,
    fontSize: 32,
    marginTop: -2,
  },
});
