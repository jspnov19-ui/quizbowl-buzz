import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Game, Player, QuestionEvent, Team } from "@/lib/game";

export function downloadMatchReport({
  game,
  teams,
  players,
  events,
}: {
  game: Game;
  teams: Team[];
  players: Player[];
  events: QuestionEvent[];
}) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;

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

  const now = new Date();
  const dateStr = now.toLocaleString();

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Quibbol Buzz — Match Report", margin, 60);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Room ${game.code}  ·  ${dateStr}`, margin, 78);
  doc.setTextColor(0);

  // Match summary box
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Final Score", margin, 112);

  doc.setFontSize(22);
  const scoreLine = `${t1?.name ?? "Team 1"}  ${t1Score}   —   ${t2Score}  ${t2?.name ?? "Team 2"}`;
  doc.text(scoreLine, margin, 140);

  doc.setFontSize(13);
  doc.setTextColor(20, 80, 160);
  doc.text(`Winner: ${winner}`, margin, 162);
  doc.setTextColor(0);

  // Question-by-question table — use chronological order
  const ordered = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  let s1 = 0;
  let s2 = 0;
  const rows = ordered.map((e) => {
    const player = players.find((p) => p.id === e.player_id);
    const team = teams.find((t) => t.id === e.team_id);
    const pts = e.points ?? 0;
    const bonus = e.bonus_points;
    if (e.team_id === t1?.id) s1 += pts + (bonus ?? 0);
    if (e.team_id === t2?.id) s2 += pts + (bonus ?? 0);
    return [
      `#${e.question_number}`,
      player?.name ?? "—",
      team?.name ?? "—",
      pts > 0 ? `+${pts}` : `${pts}`,
      bonus === null || bonus === undefined ? "—" : `+${bonus}`,
      `${s1} – ${s2}`,
    ];
  });

  autoTable(doc, {
    startY: 188,
    margin: { left: margin, right: margin },
    head: [["Q", "Player", "Team", "Tossup", "Bonus", "Running"]],
    body: rows.length > 0 ? rows : [["—", "No questions answered", "", "", "", ""]],
    theme: "striped",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: "bold" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
  });

  // Final summary footer
  // @ts-expect-error autoTable attaches lastAutoTable
  const endY: number = doc.lastAutoTable?.finalY ?? 200;
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

  doc.save(`quibbol-match-${game.code}-${now.toISOString().slice(0, 10)}.pdf`);
}
