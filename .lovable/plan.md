# Plan

## Root cause of "Failed to create game"

The connected Supabase database is missing columns and tables the app code expects. Confirmed via schema query:

- `games` is missing: `mode`, `bonuses_enabled`, `timer_total_seconds`, `timer_status`, `timer_started_at`, `timer_remaining_seconds`
- `question_events` is missing: `protested`, `protest_note`
- `substitution_events` table does not exist

`createGame()` inserts `{ code, mode, bonuses_enabled }` → fails because those columns don't exist. The previous migration didn't reach this DB (likely a fresh fork/different project ref).

## PP20TUH bug

In the PDF report, `pp20 = (player.score / heard) * 20`. Two likely issues:
1. `player.score` includes the player's slice of bonus points (recalcScores adds `bonus_points` to player totals). Standard PP20TUH should be tossup-only points. Fix: compute PP20TUH from `question_events.points` only (powers + 10s − negs), excluding bonus.
2. If no substitutions ever recorded, `computeTuh` still returns `totalTossups` for active players, so TUH should be > 0. If `totalTossups` is 0 because no events exist yet, table shows "—" which is correct. Fix #1 covers the real bug.

## Scope of this turn

### 1. Schema migration (one migration)
- Add missing columns to `games` (mode, bonuses_enabled, timer fields)
- Add `protested`, `protest_note` to `question_events`
- Create `substitution_events` table with same shape as TS type
- Add tournament hub tables (see §4)

### 2. Fix create-game
No code change needed beyond migration — `createGame()` already passes the right shape.

### 3. Fix PP20TUH
In `match-report.ts`, change `pp20 = (score / heard) * 20` to use tossup-only points (sum of `points` field from this player's events, excluding bonus). Same fix everywhere PP20TUH is displayed.

### 4. Post-match per-team stats table (player + spectator screens, team mode only)

After `game.status === 'closed'`, both `play.$code.tsx` and `watch.$code.tsx` render a "Final Results" view (replacing the current "Room closed" redirect message on player screen — change to show stats instead, with a "Back to home" link below).

Each team gets a card with:
- Team name + Result (Win / Loss / Tie)
- Points (team total)
- Bonus Points: `total / (bonusesHeard × 30)`, PPB `X.XX`
- Player table: Player | TUH | P (powers/15) | TU (10s) | I (negs/-5) | PP20TUH

PP20TUH formula: `(15·P + 10·TU − 5·I) / TUH × 20`

### 5. Tournament Hub (Full v1)

New top-level section `/tournaments`. Tables:
- `tournaments` (id, name, slug, created_at, status: setup|live|complete)
- `tournament_phases` (id, tournament_id, name, order)
- `tournament_brackets` (id, phase_id, name, order)
- `tournament_teams` (id, tournament_id, name, bracket_id nullable)
- `tournament_players` (id, tournament_team_id, name)
- `tournament_rounds` (id, tournament_id, number, label)
- `tournament_games` (id, tournament_id, round_id, phase_id, bracket_id, team_a_id, team_b_id, game_id nullable, status: scheduled|live|final, score_a, score_b)

Routes:
- `/tournaments` — list/create tournaments
- `/tournaments/$slug` — overview with tabs: Standings, Players, Schedule, Game Detail
- `/tournaments/$slug/teams/$teamId` — team detail (record, players, game log)
- `/tournaments/$slug/players/$playerId` — individual detail (per-game stats, PP20TUH, totals)
- `/tournaments/$slug/games/$matchId` — game detail (full question log, like Yellowfruit scoreboard)
- `/tournaments/$slug/manage` — TD controls: add teams, phases/brackets, rounds, schedule, link live game codes

Live link: in `tournament_games`, optional `game_id` references a `games` row. When a TD starts a scheduled match, they create a new room and the tournament_game `game_id` is set. When the moderator closes that game, a hook (client-side on close) writes back `score_a`, `score_b`, `status='final'` to the tournament_game row, and standings recompute.

Limits enforced client-side (matches the Google Sheets system): ≤36 teams, ≤3 phases, ≤6 brackets/phase, ≤6 players/team, ≤12 rounds.

Standings: W-L-T, PPG, PAPG, margin, PPB, P/TU/I (totals across phase or whole tournament). Sorting + filtering by phase.

Individual standings: PP20TUH across the tournament, sortable.

## Technical details

- Migration in one batch (large). Add RLS `USING (true) WITH CHECK (true)` on tournament tables for now to match the existing public-game pattern (matches current security posture).
- All tournament tables get `tournament_id`/scope columns + indexes.
- Standings computation: client-side `useTournament(slug)` hook, similar to `useGameState`, with realtime subscription on `tournament_games`.
- Reuse `computeTotals` + per-player tossup totals helper from `game.ts`.
- Add a small `lib/tournament.ts` with types, CRUD helpers, and stats reducers.
- No moderator/auth role split yet — tournament management is open to anyone with the URL, matching the existing single-game pattern. Can layer auth later.

## Out of scope (call out explicitly)
- Real moderator auth / per-tournament access control (current app has none)
- Yellowfruit-style export
- Carryover game detection (mentioned in source post but advanced)

## Order of work
1. Migration (schema fix + tournament tables) — needs user approval before next steps
2. Fix PP20TUH in match-report.ts
3. Post-match stats UI in play.$code.tsx and watch.$code.tsx
4. Tournament hub: types/helpers → routes → manage screen → standings → details → live game linking
