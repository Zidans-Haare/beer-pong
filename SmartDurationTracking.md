Idea
A tracking of all Game Durations to calculate the mean and get better predictions

How?
Store every Game Duration in a Database Table (from previous game results input to input of current game results)

durations can also be visible in the profile page: Nick vs. Alex always takes 10min (-> that would be end level, if players already played against each other we´ll use this duration), but maybe overall mean is fine for the beginning

new table in db and timers for the duration (best duration frame, else is not trackable? shoulned be visible no new button "game start", "game end" -> user experience)

First AI Implementation Plan:

  startedAt       DateTime? // When the table became free
  endedAt         DateTime? // When result was entered
  durationSeconds Int?      // Computed duration for fast queries
}
B. The Prediction Engine (DurationService.ts)
A central service that anyone can ask: "How long will Player A vs Player B take?"

Algorithm Levels:

Historic Matchup: Average of previous A vs B matches (Weighted heavily).
Player Combined: (Avg(A) + Avg(B)) / 2.
Global Baseline: Fallback to Repo Average (e.g., 12 mins).
C. Application Usage
1. Tournament Dashboard
Progress Bar: Show "Expected Progression" vs "Actual".
Time Forecast: specific "Expected End" time for the tournament.
2. Player Profile (Stats)
"Pace" Stat: "Schnellspieler" vs. "Genießer".
Records: "Quickest Win", "Longest Battle".
3. Integrations (e.g., Spotify)
External services (like the Music Bot) simply consume the DurationService.getPrediction() to do their job, but the tracking logic is purely internal.
4. Implementation Steps
Schema Migration: Add fields to Match.
Data Backfill: (Optional) Calculate approximate durations for old matches if timestamps exist.
Service Logic: Implement DurationService with the "Passive Slot" logic.
UI Updates: Add duration stats to the Match History and Profile.
This creates a robust data foundation for all time-based features.