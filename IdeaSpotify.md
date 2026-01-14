Idea:
1. Spotify Integration, jeder Spieler kann sich einen Song wünschen der automatisch zu seiner Runde gespielt wird.
2. Wenn ein Host ein Turnier erstellt wird automatisch eine shared Playlist angelegt oder er kann eine anhängen, bis zum Datum des Turniers kann jeder zusagen und gleichzeitig Songs in die Playlist hinzufügen, am Ende gibt das zum Turnier die fertige Playlist, jeder hört mal seine Lieblingssongs.

Wie?
1. Bierpong Abende haben immer Musik in den meisten Fällen steuert einer die Musik und ist mit der Soundanlage verbunden. Ein neues Feature von Spotify ist "Jam" dort können Leute im selben Netzwerk der Playlist beitreten, d.h. Songs hinzufügen. Die Bier Pong App könnte Lieder einsammeln und diese perfekt eintakten wann jemand spielt durch die durchschnittliche Spieldauer, es reicht wenn das ca. ist muss nicht punktgenau sein, es soll nur das Gefühl entstehen es ist so das es passend zu seinem Spiel kommt.

2. Wahrscheinlich relativ einfach zu realisiren, App legt Playlist an mit Datum und Turnier Name bspw.

Vorraussetzung?
-Jeder müsste seine Web App mit Spotify verkünpfen das geht aber gut müsste nur einmalig sein
-Import von Spotify Lieder Bibliothek, damit man die Songs bequem über die App hinzufügen kann ODER eine Spotify IFrame Integration, wir bleiben in der Bier Pong App, sparen uns die Bibliotheken und programierarbeit und haben die selben Funktionen, vielleicht sogar besser


Hier ich habe schonmal eine KI nach Implementierung gefragt:
Spotify Integration Implementation Plan
Goal
Implement "Smart Queueing" for Walk-on Songs and "Tournament Playlists" using the Spotify Web API.

User Review Required
IMPORTANT

Prisma Schema Changes: We need to add SpotifyCredentials to the User model (or a separate table) to store refresh tokens. We also need songUri in PlayerProfile.

WARNING

Spotify Developer Account: You will need to create a Spotify App in the Spotify Dashboard and provide SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the .env file.

Proposed Changes
1. Database Schema (schema.prisma)
[MODIFY] schema.prisma
Add SpotifyToken model (relation to User) to store accessToken, refreshToken, expiresAt.
Update Tournament model: field spotifyPlaylistId (String?).
Update PlayerProfile model: field walkOnSongUri (String?), walkOnSongStartMs (Int? - optional start time).
2. Backend Services (src/lib/services/)
[NEW] src/lib/services/SpotifyService.ts
Auth: getAuthUrl(), exchangeCode(code), refreshAccessToken(token).
User: searchTracks(query), setPlayerWalkOnSong(uri).
Tournament: createTournamentPlaylist(name), addTrackToPlaylist(playlistId, uri).
Smart Queue (The Brain):
ensureSongIsNext(playlistId, songUri, currentPlaybackState)
Logic: Check current playing item -> Check upcoming items -> Call reorderPlaylist to move songUri to index + 1.
[MODIFY] src/lib/services/MatchService.ts
In startMatch (or a helper method called prepareMatch):
Trigger SpotifyService.ensureSongIsNext() for the Home Player's song.
(Optional) Trigger for Away Player? Usually only one walks on at a time or they alternate? Assumption: Home player song plays first or "Walk-on" is specific to the "Next Game" context.
3. API Routes (src/app/api/)
[NEW] src/app/api/spotify/auth/route.ts
Handle OAuth callback.
[NEW] src/app/api/spotify/search/route.ts
Proxy for client-side song searching (to keep secrets hidden).
4. Frontend Components
[NEW] src/components/spotify/SpotifyConnectButton.tsx
"Connect Spotify" button for User Profile.
[NEW] src/components/spotify/SongSelector.tsx
Search bar + Result list.
Usage: Player Profile -> "Choose Walk-on Song".
[MODIFY] src/app/dashboard/profile/page.tsx
Add the Connect Button and Song Selector.
[MODIFY] src/components/tournament/TournamentDashboard.tsx
Add a "Music Control" widget (Read-only view of what's playing?).
Add a "Sync Playlist" button for the Host.
Verification Plan
Automated Tests
We cannot mock the Spotify API easily in unit tests without complex mocking.
Focus on unit testing the SmartQueue logic: "Given a list of tracks and durations, calculate the correct insert index."
Manual Verification
Setup: Configure .env with Spotify Creds.
Auth: User A logs in, connects Spotify.
Selection: User A picks "Eye of the Tiger". DB updates.
Tournament: Host creates Tournament. Playlist appears in Host's Spotify.
Queueing:
Start a song on Host's Spotify.
Click "Prepare Match" (simulate).
Observe: Does "Eye of the Tiger" jump to the top of the "Next Up" in the Spotify App?