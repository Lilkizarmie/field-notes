# Field Notes

Field Notes is an offline-first mobile application built with React Native and Expo. It allows users to create, edit, and delete notes even without an internet connection. Changes are queued and synchronized with the backend server when connectivity is restored.

## Architecture Overview

The application follows a clean architecture pattern, separating concerns into distinct layers:

### Layers

1.  **UI Layer (`src/screens`, `src/components`, `src/navigation`)**:
    *   Handles user interaction and display.
    *   Screen components (`NotesListScreen`, `CreateEditNoteScreen`, `NoteDetailScreen`) manage local screen state and user input.
    *   Uses React Navigation for routing.
    *   Follows a centralized theme system (`src/utils/theme.ts`) for consistent styling.

2.  **Domain Layer (`src/domain`)**:
    *   Contains business entities and types (`Note.ts`).
    *   Defines the core data structures used throughout the app.

3.  **Data Layer (`src/data`)**:
    *   **Repository Pattern (`NoteRepository.ts`)**: abstracts data access. The app mainly interacts with this repository rather than direct API or Database calls.
    *   **Local Database (`database.ts`)**: Uses SQLite (`expo-sqlite`) for persisting notes locally. This is the "source of truth" for the UI.
    *   **API Client (`api.ts`)**: Handles HTTP requests to the backend API using `axios`.

4.  **Service Layer (`src/services`)**:
    *   **Sync Service (`SyncService.ts`)**: Orchestrates the synchronization between the local SQLite database and the remote API. It handles network status checks, queues pending changes, and resolves conflicts.

### Data Flow

*   **Read**: UI requests data from `NoteRepository`. `NoteRepository` fetches data *only* from the local SQLite database. This ensures the app works offline seamlessly.
*   **Write**: UI sends create/update/delete commands to `NoteRepository`. The repository updates the local database immediately and marks the record as `pending` sync. It then triggers the `SyncService`.
*   **Sync**: `SyncService` runs in the background (or triggered by user action). It checks for internet connectivity. If online, it iterates through `pending` records and sends requests to the API.

## Offline and Sync Strategy

The app utilizes a "Local First" approach.

1.  **Persistence**: All data is stored in a local SQLite database.
2.  **Tracking Changes**: The `notes` table has `sync_status` ('synced', 'pending', 'failed') and `sync_action` ('create', 'update', 'delete') columns.
    *   When a user modifies a note, we update the local record and set `sync_status = 'pending'`.
3.  **Synchronization Process**:
    *   **Create**: POST to `/notes`. On success, update local `id` to match server `id` and mark `synced`.
    *   **Update**: PATCH to `/notes/{id}`. Send `updatedAt` for optimistic locking.
    *   **Delete**: DELETE to `/notes/{id}`. On success or 404, hard delete locally (or mark deleted).
4.  **Handling IDs**:
    *   New notes created offline generate a temporary UUID.
    *   Upon successful sync, the server's ID replaces the temporary ID in the local database.

## Conflict Handling

The system uses a "Last Write Wins" policy enforced by the server, with clients respecting the server's state on conflict.

*   **Detection**: When sending an update, we include the `updatedAt` timestamp of the version we are editing.
*   **Resolution**:
    *   If the API returns **409 Conflict**, it means the note has been modified on the server since we last fetched it.
    *   The API returns the latest server version in the response body.
    *   **Strategy**: We automatically accept the server version. The local note is updated with the server's data (`title`, `body`, `tags`, `updatedAt`) and marked as `synced`. The user's local changes are overwritten to ensure consistency.

## Setup Instructions

### Prerequisites
*   Node.js
*   Expo CLI (`npm install -g expo-cli`)

### Installation
1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the App
1.  Start the development server:
    ```bash
    npm start
    ```
2.  Press `i` to run on iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go app.

### Running Tests
Execute unit tests with Jest:
```bash
npm test
```

## Key Trade-offs and Next Steps

*   **Conflict Resolution**: Automatically overwriting user changes on conflict (409) is simple but can result in data loss for the user.
    *   *Improvement*: Present a "Merge Conflict" UI where the user can compare versions and choose which fields to keep.
*   **Sync Triggers**: Currently, sync is triggered on app actions (save/delete) or manual button press.
    *   *Improvement*: Implement background background fetch or listen to network reachability changes to auto-sync when coming back online.
*   **Performance**: The current implementation loads all notes into memory for the list view.
    *   *Improvement*: Implement pagination with the `FlashList` or `FlatList` `onEndReached` prop and offset-based SQL queries.
*   **Error Handling**: Basic error alerts are shown.
    *   *Improvement*: More granular error messages and retry logic for specific http codes.
