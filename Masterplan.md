Übersicht

     Transformation der bestehenden Next.js 15 PWA zu einer nativen App-Experience für 99% Mobile-Nutzer.

     ---
     Phase 1: Foundation & Quick-Wins (Sofort spürbar)

     1.1 Safe Area Fix & Viewport Polish

     Problem: Header wird abgeschnitten auf neueren iPhones
     Dateien:
     - src/app/globals.css - Safe Area Insets hinzufügen
     - src/app/layout.tsx - Viewport-Konfiguration erweitern

     Änderungen:
     /* Safe Area Support */
     body {
       padding-top: env(safe-area-inset-top);
       padding-bottom: env(safe-area-inset-bottom);
       padding-left: env(safe-area-inset-left);
       padding-right: env(safe-area-inset-right);
     }

     .bottom-nav {
       bottom: calc(24px + env(safe-area-inset-bottom));
     }

     1.2 Manifest.json Upgrade

     Datei: public/manifest.json
     Änderungen:
     - Mehrere Icon-Größen (192x192, 512x512, maskable)
     - display_override: ["standalone", "minimal-ui"]
     - scope und id für bessere Installation
     - Shortcuts für Schnellzugriff
     - Screenshots für Install-Prompt

     1.3 Haptic Feedback System

     Neue Datei: src/lib/haptics.ts
     Integration in:
     - Button-Clicks
     - Match-Ergebnis eintragen
     - Navigation
     - Erfolgs-/Fehler-Feedback

     export const haptic = {
       light: () => navigator.vibrate?.(10),
       medium: () => navigator.vibrate?.(25),
       heavy: () => navigator.vibrate?.(50),
       success: () => navigator.vibrate?.([10, 50, 10]),
       error: () => navigator.vibrate?.([50, 100, 50]),
     };

     1.4 Page Transitions mit Framer Motion

     Neue Datei: src/components/PageTransition.tsx
     Integration: Wrapper um {children} in Layout

     ---
     Phase 2: Offline-First PWA

     2.1 Erweiterter Service Worker

     Datei: public/sw.js (komplett neu)
     Features:
     - App-Shell Caching (HTML, CSS, JS, Fonts)
     - Runtime Caching für API-Calls
     - Offline-Fallback Page
     - Background Sync für verzögerte Aktionen
     - Cache-Versioning für Updates

     Strategie:
     - Statische Assets: Cache-First
     - API-Calls: Network-First mit Cache-Fallback
     - Bilder: Stale-While-Revalidate

     2.2 Offline-Indicator Component

     Neue Datei: src/components/OfflineIndicator.tsx
     - Elegantes Banner wenn offline
     - Auto-Hide wenn wieder online
     - Pending-Actions Counter

     2.3 IndexedDB für lokale Daten

     Neue Datei: src/lib/offlineStore.ts
     - Turnier-Details cachen
     - Pending Match-Updates speichern
     - Sync wenn wieder online

     ---
     Phase 3: QR-Code Instant-Join System

     3.1 QR-Code Generation

     Neue Dateien:
     - src/lib/qrcode.ts - QR-Code Generierung (mit qrcode library)
     - src/components/TournamentQRCode.tsx - Display Component

     Features:
     - Dynamischer QR-Code mit Turnier-ID
     - Optional: Secret-Token für private Turniere
     - Animierter QR mit Logo in der Mitte
     - "Teilen" Button (Web Share API)

     3.2 QR-Code Scanner

     Neue Dateien:
     - src/components/QRScanner.tsx - Kamera-basierter Scanner
     - src/app/join/page.tsx - Join-Flow Landing

     Features:
     - Nutzt navigator.mediaDevices.getUserMedia
     - jsQR Library für Dekodierung
     - Direkter Redirect zum Turnier

     3.3 Kurz-Code System (Alternative zu QR)

     Änderungen:
     - Prisma Schema: shortCode Feld für Tournament
     - 6-stelliger alphanumerischer Code (wie Kahoot)
     - /join/[code] Route

     ---
     Phase 4: Biometrische Authentifizierung

     4.1 WebAuthn/Passkey Integration

     Neue Dateien:
     - src/lib/webauthn.ts - WebAuthn Helpers
     - src/app/api/auth/webauthn/route.ts - Server Endpoints
     - src/components/BiometricLoginButton.tsx

     Features:
     - "Mit Face ID anmelden" Button
     - Passkey-Registrierung nach erstem Login
     - Fallback zu Password

     4.2 Credential Management

     Integration in: src/app/login/page.tsx
     - CredentialManagment API für "Angemeldet bleiben"
     - Automatisches Re-Auth bei sensiblen Aktionen

     ---
     Phase 5: Enhanced Animations & UX

     5.1 Skeleton Loading

     Neue Datei: src/components/Skeleton.tsx
     Integration in:
     - Turnierliste
     - Match-Karten
     - Spielerliste

     5.2 Pull-to-Refresh

     Neue Datei: src/components/PullToRefresh.tsx
     - Custom Animation
     - Haptic Feedback
     - Integration auf Hauptseiten

     5.3 Swipe-Gesten für Matches

     Neue Datei: src/components/SwipeableMatchCard.tsx
     - Swipe links = Ergebnis eintragen
     - Swipe rechts = Details anzeigen
     - Framer Motion Drag-Gestures

     5.4 Konfetti & Erfolgs-Animationen

     Neue Datei: src/components/Confetti.tsx
     - Bei Turniersieg
     - Bei Match-Gewinn
     - Canvas-basiert für Performance

     5.5 Screen Wake Lock

     Neue Datei: src/hooks/useWakeLock.ts
     - Display bleibt an während Turnier läuft
     - Automatisch deaktiviert wenn Turnier endet

     ---
     Phase 6: Echtzeit & Notifications

     6.1 WebSocket Integration (Optional - größerer Aufwand)

     Alternative: Server-Sent Events (SSE)
     - Echtzeit Match-Updates
     - Lobby-Presence ("Max ist beigetreten")
     - Typing Indicators

     6.2 Erweiterte Push-Notifications

     Änderungen in: public/sw.js + Backend
     - Notification Actions ("Bestätigen" / "Später")
     - Rich Notifications mit Bildern
     - Kategorien (Match-Erinnerung, Ergebnis, etc.)

     ---
     Phase 7: Kamera-Features

     7.1 Profilbild-Aufnahme

     Neue Datei: src/components/CameraCapture.tsx
     - Direkter Kamera-Zugriff
     - Crop/Resize vor Upload
     - Fallback zu File-Input

     7.2 Action-Shot nach Match (Optional)

     - Foto nach Sieg
     - Share-Button mit Web Share API
     - Overlay mit Turnier-Branding

     ---
     Technische Voraussetzungen

     Neue Dependencies

     {
       "qrcode": "^1.5.3",        // QR Generation
       "jsqr": "^1.4.0",          // QR Scanning
       "@simplewebauthn/browser": "^10.0.0",  // WebAuthn Client
       "@simplewebauthn/server": "^10.0.0",   // WebAuthn Server
       "idb-keyval": "^6.2.1"     // IndexedDB Wrapper
     }

     Prisma Schema Erweiterungen

     model Tournament {
       // ... existing fields
       shortCode    String?   @unique  // 6-stelliger Join-Code
     }

     model Passkey {
       id              String   @id @default(cuid())
       credentialId    String   @unique
       publicKey       Bytes
       counter         BigInt
       userId          String
       user            User     @relation(fields: [userId], references: [id])
       createdAt       DateTime @default(now())
     }

     ---
     Implementierungs-Reihenfolge

     Woche 1: Phase 1 (Foundation) - Sofort sichtbare Verbesserungen
              └─ Safe Area, Manifest, Haptics, Page Transitions

     Woche 2: Phase 2 (Offline) - PWA auf nächstes Level
              └─ Service Worker, Offline Storage, Sync

     Woche 3: Phase 3 (QR-Join) - Killer-Feature für Lobbys
              └─ QR Generation, Scanner, Short-Codes

     Woche 4: Phase 4 (Biometrie) - Premium Auth Experience
              └─ WebAuthn, Passkeys

     Woche 5: Phase 5 (Animations) - Polish & Delight
              └─ Skeletons, Pull-to-Refresh, Swipe, Confetti

     Woche 6: Phase 6-7 (Extras) - Nice-to-Haves
              └─ WebSocket/SSE, Kamera-Features

     ---
     Verifikation & Testing

     Phase 1 Testing

     - iPhone mit Notch öffnen - Header nicht abgeschnitten
     - Haptic Feedback bei Button-Klicks spürbar
     - Smooth Page Transitions zwischen Routes

     Phase 2 Testing

     - App öffnen, dann Flugmodus - App lädt trotzdem
     - Offline Match-Ergebnis eintragen - synct wenn online
     - Offline-Banner erscheint elegant

     Phase 3 Testing

     - QR-Code generieren und mit zweitem Handy scannen
     - 6-stelligen Code eingeben → landet im Turnier
     - Share-Button öffnet System-Share-Sheet

     Phase 4 Testing

     - Face ID / Touch ID Login funktioniert
     - Passkey nach erstem Login angeboten
     - Fallback zu Password klappt

     Phase 5 Testing

     - Skeleton Loading statt Spinner
     - Pull-to-Refresh mit Animation
     - Swipe auf Match-Karte funktioniert
     - Konfetti bei Turniersieg

     ---
     Kritische Dateien
     ┌───────────────────────────────────┬──────────────┬───────┐
     │               Datei               │ Änderungstyp │ Phase │
     ├───────────────────────────────────┼──────────────┼───────┤
     │ src/app/globals.css               │ Modify       │ 1     │
     ├───────────────────────────────────┼──────────────┼───────┤
     │ src/app/layout.tsx                │ Modify       │ 1, 5  │
     ├───────────────────────────────────┼──────────────┼───────┤
     │ public/manifest.json              │ Modify       │ 1     │
     ├───────────────────────────────────┼──────────────┼───────┤
     │ public/sw.js                      │ Replace      │ 2     │
     ├───────────────────────────────────┼──────────────┼───────┤
     │ prisma/schema.prisma              │ Modify       │ 3, 4  │
     ├───────────────────────────────────┼──────────────┼───────┤
     │ src/app/login/page.tsx            │ Modify       │ 4     │
     ├───────────────────────────────────┼──────────────┼───────┤
     │ src/app/tournaments/[id]/page.tsx │ Modify       │ 3, 5  │