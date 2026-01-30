import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NotesListScreen } from '@/screens/NotesListScreen';
import { CreateEditNoteScreen } from '@/screens/CreateEditNoteScreen';
import { NoteDetailScreen } from '@/screens/NoteDetailScreen';
import { COLORS } from '@/utils/theme';

export type RootStackParamList = {
  NotesList: undefined;
  CreateEditNote: { noteId?: string }; // if undefined, it's create
  NoteDetail: { noteId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        <Stack.Screen
          name="NotesList"
          component={NotesListScreen}
          options={{ title: 'Field Notes' }}
        />
        <Stack.Screen
          name="NoteDetail"
          component={NoteDetailScreen}
          options={{ title: 'Note Details' }}
        />
        <Stack.Screen
          name="CreateEditNote"
          component={CreateEditNoteScreen}
          options={({ route }) => ({
            title: route.params.noteId ? 'Edit Note' : 'New Note'
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
