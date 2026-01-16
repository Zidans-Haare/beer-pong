# Tournament System Specification

## Übersicht der Turniermodi

### 1. SINGLE_ELIMINATION (K.O.-System)

#### Struktur
- **Bracket-Größe**: Nächste Zweierpotenz (2, 4, 8, 16, 32...)
- **Runden**: log2(bracket_size)
- **Matches pro Runde**: bracket_size / 2^runde

#### Beispiel: 8 Spieler
```
Runde 1 (Viertelfinale):     Runde 2 (Halbfinale):     Runde 3 (Finale):
Match 0: P1 vs P2  ─┐
                    ├─► Match 0: W0 vs W1  ─┐
Match 1: P3 vs P4  ─┘                       ├─► Match 0: W0 vs W1 (FINALE)
                                            │
Match 2: P5 vs P6  ─┐                       │
                    ├─► Match 1: W2 vs W3  ─┘
Match 3: P7 vs P8  ─┘

                                            └─► Match 1: L(HF0) vs L(HF1) (3. PLATZ)
```

#### Erwartetes Verhalten
| Aspekt | Erwartung |
|--------|-----------|
| **Bye-Handling** | Wenn Spielerzahl < Bracket-Größe, bekommen überzählige Slots ein Freilos |
| **Bye-Match** | `isPlayed=true`, `winnerId=player1Id`, `player2Id=null` |
| **Winner-Advancement** | Position im nächsten Match = floor(currentPosition / 2) |
| **Slot-Zuweisung** | Gerade Position → player1, Ungerade → player2 |
| **3. Platz Match** | Existiert nur wenn rounds > 1, Position=1 in letzter Runde |
| **Verlierer → 3. Platz** | Nur Verlierer aus Runde (maxRound - 1) gehen ins 3.-Platz-Match |
| **Tournament Complete** | Wenn alle Matches in maxRound gespielt sind |

#### Chronologische Reihenfolge
1. **Runde 1**: Alle Matches können parallel gespielt werden
2. **Runde 2+**: Match wird spielbar wenn beide Spieler gesetzt sind
3. **Finale & 3. Platz**: Können parallel gespielt werden (beide in letzter Runde)

#### Ergebnis-Eintragung
- Nur Matches mit `player1Id AND player2Id != null` können Ergebnisse bekommen
- Nach Ergebnis: `winnerId` wird gesetzt basierend auf score1 vs score2
- Unentschieden (`score1 == score2`): `winnerId = null` (nicht erlaubt in Elimination!)

---

### 2. ROUND_ROBIN (Liga / Jeder gegen Jeden)

#### Struktur
- **Matches**: n*(n-1)/2 (ohne Rückspiel) oder n*(n-1) (mit Rückspiel)
- **Runden**: n-1 (bei gerader Spielerzahl) oder n (bei ungerader + virtuellem Spieler)
- **Algorithmus**: Berger-Tabelle für optimale Paarungen

#### Beispiel: 4 Spieler (ohne Rückspiel)
```
Runde 1:          Runde 2:          Runde 3:
P1 vs P4          P1 vs P3          P1 vs P2
P2 vs P3          P4 vs P2          P3 vs P4

Total: 6 Matches (4*3/2 = 6)
```

#### Erwartetes Verhalten
| Aspekt | Erwartung |
|--------|-----------|
| **Paarungen** | Jeder Spieler spielt genau einmal gegen jeden anderen |
| **Mit Rückspiel** | Jede Paarung kommt 2x vor (Heim/Auswärts getauscht) |
| **Stage** | Alle Matches haben `stage='LEAGUE'` |
| **Punkte** | Sieg=3, Unentschieden=1, Niederlage=0 |
| **Standings** | Sortiert nach: Punkte → Tordifferenz → Tore geschossen |
| **Tournament Complete** | Automatisch wenn alle LEAGUE-Matches gespielt |

#### Chronologische Reihenfolge
1. **Alle Matches**: Theoretisch können alle parallel gespielt werden
2. **Empfohlen**: Rundenweise spielen für faire Bedingungen
3. **Keine Abhängigkeiten**: Kein Match wartet auf ein anderes

#### TournamentStanding Updates
Nach jedem Match:
```
Winner:  played+1, won+1, goalsFor+score, goalsAgainst+oppScore, points+3
Loser:   played+1, lost+1, goalsFor+score, goalsAgainst+oppScore, points+0
Draw:    played+1, drawn+1, goalsFor+score, goalsAgainst+oppScore, points+1
```

---

### 3. GROUPS (Gruppenphase + K.O.)

#### Struktur
- **Phase 1**: 2 Gruppen, jede spielt intern Round-Robin
- **Phase 2**: Top 2 jeder Gruppe → K.O.-Bracket

#### Gruppen-Aufteilung
```
n Spieler:
- Gruppe 1: floor(n/2) Spieler
- Gruppe 2: ceil(n/2) Spieler (bei ungerader Zahl 1 mehr)
```

#### Beispiel: 8 Spieler
```
GRUPPENPHASE:
Gruppe A (4 Spieler):     Gruppe B (4 Spieler):
A1 vs A2, A3, A4          B1 vs B2, B3, B4
A2 vs A3, A4              B2 vs B3, B4
A3 vs A4                  B3 vs B4
(6 Matches)               (6 Matches)

K.O.-PHASE (nach manueller Auslösung):
Halbfinale 1: A1 vs B2
Halbfinale 2: B1 vs A2
Finale: Winner HF1 vs Winner HF2
3. Platz: Loser HF1 vs Loser HF2
```

#### Erwartetes Verhalten
| Aspekt | Erwartung |
|--------|-----------|
| **Stage Labels** | `GROUP_1` und `GROUP_2` |
| **Standings** | Separate Tabelle pro Gruppe (groupId: 1 oder 2) |
| **K.O.-Start** | Manuell durch Host ("Playoffs starten" Button) |
| **Qualifikation** | Top 2 jeder Gruppe → 4 Teams im Halbfinale |
| **Crossover** | A1 vs B2, B1 vs A2 (Gruppenerste gegen Gruppenzweite der anderen) |

#### Chronologische Reihenfolge
1. **Gruppenphase**: Alle Gruppenmatches können parallel laufen
2. **Warten**: Alle Gruppenmatches müssen fertig sein
3. **Host-Aktion**: "Playoffs starten" klicken
4. **K.O.-Phase**: Wie SINGLE_ELIMINATION

---

## Match-Progression-Logik

### Single Elimination Advancement

```typescript
// Nach Match-Ergebnis:
nextRound = currentRound + 1
nextPosition = floor(currentPosition / 2)
slotInNextMatch = (currentPosition % 2 === 0) ? 'player1Id' : 'player2Id'

// Beispiel: Match in R1, Position 3 gewinnt
// → Geht zu R2, Position 1 (floor(3/2)=1), als player2 (3%2=1)
```

### 3. Platz Match Population

```typescript
// Nur wenn currentRound === maxRound - 1 (Halbfinale)
if (currentRound === maxRound - 1) {
    // Verlierer geht zu Position 1 in maxRound
    thirdPlaceMatch = findMatch(tournamentId, maxRound, position=1)
    loser = (winnerId === player1Id) ? player2Id : player1Id
    updateMatch(thirdPlaceMatch, slotInNextMatch, loser)
}
```

### Match Playability

Ein Match ist spielbar wenn:
1. `player1Id !== null AND player2Id !== null`
2. `isPlayed === false`
3. `startedAt` wird gesetzt wenn beide Spieler eingetragen sind

---

## Validierungsregeln

### Score-Eingabe
- `score1` und `score2` müssen >= 0 sein
- Bei Elimination: Unentschieden nicht erlaubt (muss Gewinner geben)
- Bei Liga/Gruppe: Unentschieden erlaubt

### Turnier-Status-Übergänge
```
PLANNED → ACTIVE (startTournament)
ACTIVE → COMPLETED (alle Matches gespielt)
```

### Minimum Spielerzahlen
| Modus | Minimum |
|-------|---------|
| SINGLE_ELIMINATION | 2 |
| ROUND_ROBIN | 2 |
| GROUPS | 4 (2 pro Gruppe) |

---

## Test-Szenarien

### Szenario 1: 4-Spieler Single Elimination
```
Input: [P1, P2, P3, P4]
Erwartete Matches:
- R1M0: P? vs P? (random shuffle)
- R1M1: P? vs P?
- R2M0: null vs null (Finale)
- R2M1: null vs null (3. Platz)

Nach R1M0 (Score 10:5, P1 gewinnt):
- R2M0.player1Id = P1

Nach R1M1 (Score 8:10, P4 gewinnt):
- R2M0.player2Id = P4
- R2M0 jetzt spielbar!

Nach R2M0 (Finale, Score 10:7, P1 gewinnt):
- Tournament COMPLETED
```

### Szenario 2: 6-Spieler Round Robin
```
Input: [P1, P2, P3, P4, P5, P6]
Erwartete Matches: 15 (6*5/2)
Erwartete Runden: 5 (6-1)

Alle Matches von Anfang an spielbar.

Nach allen Matches:
- Standings sortiert nach Punkten
- Tournament COMPLETED
```

### Szenario 3: 8-Spieler Groups
```
Input: [P1, P2, P3, P4, P5, P6, P7, P8]
Gruppe A: [P1, P2, P3, P4] → 6 Matches
Gruppe B: [P5, P6, P7, P8] → 6 Matches

Nach Gruppenphase:
- A-Tabelle: z.B. P2(9pts), P1(6pts), P4(3pts), P3(0pts)
- B-Tabelle: z.B. P6(9pts), P8(6pts), P5(3pts), P7(0pts)

Host klickt "Playoffs starten":
- HF1: P2 vs P8
- HF2: P6 vs P1
- Finale: Winner HF1 vs Winner HF2
- 3.Platz: Loser HF1 vs Loser HF2
```

---

## Bekannte Einschränkungen

1. **Team-Standings**: Nur für Solo-Mode implementiert, nicht für Team-Mode
2. **Gruppen > 2**: System unterstützt nur 2 Gruppen
3. **Playoffs manuell**: Host muss K.O.-Phase manuell starten
4. **Kein Double-Elimination**: Nur Single-Elimination unterstützt
