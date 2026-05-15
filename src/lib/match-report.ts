import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Game, Player, QuestionEvent, SubstitutionEvent, Team } from "@/lib/game";
import { playerStatLine, teamPPB } from "@/lib/game";

export function downloadMatchReport({
  game,
  teams,
  players,
  events,
  subEvents = [],
}: {
  game: Game;
  teams: Team[];
  players: Player[];
  events: QuestionEvent[];
  subEvents?: SubstitutionEvent[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  const now = new Date();
  const dateStr = now.toLocaleString();
  const isFFA = game.mode === "ffa";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(
    `Quibbol Buzz — ${isFFA ? "Free-for-All" : "Match"} Report`,
    margin,
    60,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `Room ${game.code}  ·  ${isFFA ? "FFA" : "Teams"}  ·  ${dateStr}`,
    margin,
    78,
  );
  doc.setTextColor(0);

  if (isFFA) {
    renderFFA(doc, { game, players, events, subEvents }, margin);
  } else {
    renderTeams(doc, { game, teams, players, events, subEvents }, margin, pageW);
  }

  doc.save(
    `quibbol-${isFFA ? "ffa" : "match"}-${game.code}-${now.toISOString().slice(0, 10)}.pdf`,
  );
}

// Build a single chronological log row list interleaving question events
// and substitution events, ordered by question_number then created_at.
type LogRow =
  | { kind: "q"; q: number; e: QuestionEvent; ts: string }
  | { kind: "sub"; q: number; s: SubstitutionEvent; ts: string };

function buildLog(events: QuestionEvent[], subEvents: SubstitutionEvent[]): LogRow[] {
  const rows: LogRow[] = [
    ...events.map((e): LogRow => ({ kind: "q", q: e.question_number, e, ts: e.created_at })),
    ...subEvents.map((s): LogRow => ({ kind: "sub", q: s.question_number, s, ts: s.created_at })),
  ];
  rows.sort((a, b) => (a.q - b.q) || a.ts.localeCompare(b.ts));
  return rows;
}

function renderTeams(
  doc: jsPDF,
  {
    teams,
    players,
    events,
    subEvents,
  }: { game: Game; teams: Team[]; players: Player[]; events: QuestionEvent[]; subEvents: SubstitutionEvent[] },
  margin: number,
  pageW: number,
) {
  const t1 = teams[0];
  const t2 = teams[1];
  const t1Score = t1?.score ?? 0;
  const t2Score = t2?.score ?? 0;
  const winner =
    !t1 || !t2
      ? "—"
      : t1Score > t2Score
        ? `${t1.name} wins`
        : t2Score > t1Score
          ? `${t2.name} wins`
          : "Tie";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Final Score", margin, 112);

  doc.setFontSize(22);
  doc.text(`${t1?.name ?? "Team 1"}  ${t1Score}   —   ${t2Score}  ${t2?.name ?? "Team 2"}`, margin, 140);

  doc.setFontSize(13);
  doc.setTextColor(20, 80, 160);
  doc.text(`Winner: ${winner}`, margin, 162);
  doc.setTextColor(0);

  const log = buildLog(events, subEvents);
  let s1 = 0;
  let s2 = 0;
  const rows = log.map((r) => {
    if (r.kind === "sub") {
      const player = players.find((p) => p.id === r.s.player_id);
      const team = teams.find((t) => t.id === r.s.team_id);
      const action = r.s.action === "in" ? "subbed in" : "subbed out";
      return [
        `#${r.q}`,
        `${player?.name ?? "—"} ${action}`,
        team?.name ?? "—",
        "—",
        "—",
        `${s1} – ${s2}`,
        "",
      ];
    }
    const e = r.e;
    const player = players.find((p) => p.id === e.player_id);
    const team = teams.find((t) => t.id === e.team_id);
    const pts = e.points ?? 0;
    const bonus = e.bonus_points;
    if (e.team_id === t1?.id) s1 += pts + (bonus ?? 0);
    if (e.team_id === t2?.id) s2 += pts + (bonus ?? 0);
    const flag = e.protested ? `[!] ${e.protest_note ?? "Protested"}` : "";
    return [
      `#${e.question_number}`,
      player?.name ?? "—",
      team?.name ?? "—",
      pts > 0 ? `+${pts}` : `${pts}`,
      bonus === null || bonus === undefined ? "—" : `+${bonus}`,
      `${s1} – ${s2}`,
      flag,
    ];
  });

  autoTable(doc, {
    startY: 188,
    margin: { left: margin, right: margin },
    head: [["Q", "Player / Event", "Team", "Tossup", "Bonus", "Running", "Flag"]],
    body: rows.length > 0 ? rows : [["—", "No questions answered", "", "", "", "", ""]],
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
      6: { textColor: [200, 30, 30], fontStyle: "italic" },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const row = rows[data.row.index];
        if (row && row[1].includes("subbed")) {
          data.cell.styles.fillColor = [240, 240, 250];
          data.cell.styles.textColor = [80, 80, 120];
          data.cell.styles.fontStyle = "italic";
        }
      }
    },
  });

  // @ts-expect-error autoTable attaches lastAutoTable
  let endY: number = doc.lastAutoTable?.finalY ?? 200;

  const totalTossups = events.reduce((m, e) => Math.max(m, e.question_number ?? 0), 0);

  for (const team of [t1, t2]) {
    if (!team) continue;
    let y = endY + 28;
    if (y > doc.internal.pageSize.getHeight() - 200) {
      doc.addPage();
      y = 60;
    }

    doc.setDrawColor(200);
    doc.line(margin, y - 14, pageW - margin, y - 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`${team.name} — ${team.score ?? 0} pts`, margin, y);

    const teamPlayers = players.filter((p) => p.team_id === team.id);
    let tp15 = 0, tp10 = 0, tn5 = 0;
    for (const p of teamPlayers) {
      const s = playerStatLine(events, p.id);
      tp15 += s.p15; tp10 += s.p10; tn5 += s.n5;
    }
    const ppb = teamPPB(events, team.id);
    const bonusEvents = events.filter(
      (e) => e.team_id === team.id && e.bonus_points !== null && e.bonus_points !== undefined,
    );
    const bonusHeard = bonusEvents.length;
    const bonusTotal = bonusEvents.reduce((s, e) => s + (e.bonus_points ?? 0), 0);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(
      `Powers (15): ${tp15}   ·   10s: ${tp10}   ·   Negs (-5): ${tn5}   ·   Bonus: ${bonusTotal} / ${bonusHeard * 30}   ·   PPB: ${ppb === null ? "—" : ppb.toFixed(2)}`,
      margin,
      y + 16,
    );
    doc.setTextColor(0);

    const sortedPlayers = [...teamPlayers].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rowsP = sortedPlayers.map((p) => {
      const s = playerStatLine(events, p.id);
      const heard = computeTuh(p, totalTossups, subEvents);
      const pp20 = heard > 0 ? ((p.score ?? 0) / heard) * 20 : 0;
      return [
        p.name + (p.is_substitute ? " (sub)" : ""),
        `${p.score ?? 0}`,
        `${s.p15}`,
        `${s.p10}`,
        `${s.n5}`,
        `${heard}`,
        heard > 0 ? pp20.toFixed(1) : "—",
      ];
    });

    autoTable(doc, {
      startY: y + 28,
      margin: { left: margin, right: margin },
      head: [["Player", "Pts", "Powers", "10s", "Negs", "TUH", "PP20TUH"]],
      body: rowsP.length > 0 ? rowsP : [["No players", "", "", "", "", "", ""]],
      theme: "striped",
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 6 },
      columnStyles: {
        1: { halign: "right", fontStyle: "bold" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "right", fontStyle: "bold" },
      },
    });
    // @ts-expect-error autoTable attaches lastAutoTable
    endY = doc.lastAutoTable?.finalY ?? y + 60;
  }

  let y = endY + 28;
  if (y > doc.internal.pageSize.getHeight() - 80) {
    doc.addPage();
    y = 60;
  }

  doc.setDrawColor(200);
  doc.line(margin, y - 14, pageW - margin, y - 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Final Summary", margin, y);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`${t1?.name ?? "Team 1"}: ${t1Score}`, margin, y + 22);
  doc.text(`${t2?.name ?? "Team 2"}: ${t2Score}`, margin, y + 40);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 80, 160);
  doc.text(`Winner: ${winner}`, margin, y + 62);
  doc.setTextColor(0);
}

// Compute approximate tossups heard for a player using sub events.
// Walk question 1..totalTossups: player is "heard" if their last sub action
// before/at that question was 'in' (or, if no action, they started active).
function computeTuh(
  player: Player,
  totalTossups: number,
  subEvents: SubstitutionEvent[],
): number {
  if (totalTossups === 0) return 0;
  const playerSubs = subEvents
    .filter((s) => s.player_id === player.id)
    .sort((a, b) => a.question_number - b.question_number || a.created_at.localeCompare(b.created_at));
  let heard = 0;
  // initial state: active players started 'in', subs started 'out'
  let active = !player.is_substitute;
  // Reconstruct via subs: assume initial state at q=1 is the inverse of first action when applicable.
  // Simpler: if first action is 'in' before any 'out', they started 'out'. We'll just simulate per question.
  for (let q = 1; q <= totalTossups; q++) {
    // apply any sub events whose question_number <= q and we haven't applied yet
    while (playerSubs.length > 0 && playerSubs[0].question_number <= q) {
      const ev = playerSubs.shift()!;
      active = ev.action === "in";
    }
    if (active) heard++;
  }
  return heard;
}

function renderFFA(
  doc: jsPDF,
  {
    players,
    events,
    subEvents,
  }: { game: Game; players: Player[]; events: QuestionEvent[]; subEvents: SubstitutionEvent[] },
  margin: number,
) {
  const ranked = [...players]
    .filter((p) => !p.is_substitute)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const winner = ranked[0];
  const tied = ranked.length > 1 && (ranked[0].score ?? 0) === (ranked[1].score ?? 0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Winner", margin, 112);

  doc.setFontSize(22);
  doc.setTextColor(20, 80, 160);
  if (!winner || (winner.score ?? 0) === 0) doc.text("—", margin, 140);
  else if (tied) doc.text(`Tie at ${winner.score} pts`, margin, 140);
  else doc.text(`${winner.name} — ${winner.score} pts`, margin, 140);
  doc.setTextColor(0);

  const lbRows = ranked.map((p, i) => {
    const { p15, p10, n5 } = playerStatLine(events, p.id);
    const answered = p15 + p10 + n5;
    return [`${i + 1}`, p.name, `${p.score ?? 0}`, `${p15}`, `${p10}`, `${n5}`, `${answered}`];
  });

  autoTable(doc, {
    startY: 168,
    margin: { left: margin, right: margin },
    head: [["#", "Player", "Score", "Powers (15)", "10s", "Negs (-5)", "Answered"]],
    body: lbRows.length > 0 ? lbRows : [["—", "No players", "", "", "", "", ""]],
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: "bold" },
      2: { halign: "right", fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
  });

  // @ts-expect-error autoTable attaches lastAutoTable
  let startY: number = (doc.lastAutoTable?.finalY ?? 220) + 28;
  if (startY > doc.internal.pageSize.getHeight() - 120) {
    doc.addPage();
    startY = 60;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Question Log", margin, startY);

  const log = buildLog(events, subEvents);
  const qRows = log.map((r) => {
    if (r.kind === "sub") {
      const player = players.find((p) => p.id === r.s.player_id);
      const action = r.s.action === "in" ? "subbed in" : "subbed out";
      return [`#${r.q}`, `${player?.name ?? "—"} ${action}`, "—", ""];
    }
    const e = r.e;
    const player = players.find((p) => p.id === e.player_id);
    const pts = e.points ?? 0;
    const flag = e.protested ? `[!] ${e.protest_note ?? "Protested"}` : "";
    return [`#${e.question_number}`, player?.name ?? "—", pts > 0 ? `+${pts}` : `${pts}`, flag];
  });

  autoTable(doc, {
    startY: startY + 12,
    margin: { left: margin, right: margin },
    head: [["Q", "Player / Event", "Result", "Flag"]],
    body: qRows.length > 0 ? qRows : [["—", "No questions answered", "", ""]],
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold" },
      2: { halign: "right", fontStyle: "bold" },
      3: { textColor: [200, 30, 30], fontStyle: "italic" },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const row = qRows[data.row.index];
        if (row && row[1].includes("subbed")) {
          data.cell.styles.fillColor = [240, 240, 250];
          data.cell.styles.textColor = [80, 80, 120];
          data.cell.styles.fontStyle = "italic";
        }
      }
    },
  });
}
