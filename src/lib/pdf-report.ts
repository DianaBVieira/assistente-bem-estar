import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Stats = {
  adherence: number;
  totalScheduled: number;
  totalTaken: number;
  totalMissed: number;
  dayBuckets: { label: string; taken: number; missed: number; adherence: number }[];
  topMissed: { name: string; count: number }[];
};

export function exportAdherencePdf(args: {
  userName: string;
  periodLabel: string;
  stats: Stats;
  start: Date;
  end: Date;
}) {
  const doc = new jsPDF();
  const { userName, periodLabel, stats, start, end } = args;

  // Header
  doc.setFillColor(14, 165, 233);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.text("Minha Rotina", 14, 14);
  doc.setFontSize(11);
  doc.text("Relatório de adesão a medicamentos", 14, 22);

  doc.setTextColor(30);
  doc.setFontSize(11);
  let y = 38;
  if (userName) { doc.text(`Paciente: ${userName}`, 14, y); y += 6; }
  doc.text(`Período: ${periodLabel}`, 14, y); y += 6;
  doc.text(`De ${fmt(start)} a ${fmt(end)}`, 14, y); y += 10;

  // Summary
  doc.setFontSize(13);
  doc.text("Resumo", 14, y); y += 6;
  doc.setFontSize(11);
  doc.text(`Taxa de adesão: ${stats.adherence}%`, 14, y); y += 5;
  doc.text(`Doses agendadas: ${stats.totalScheduled}`, 14, y); y += 5;
  doc.text(`Doses tomadas: ${stats.totalTaken}`, 14, y); y += 5;
  doc.text(`Doses esquecidas: ${stats.totalMissed}`, 14, y); y += 8;

  // Daily table
  autoTable(doc, {
    startY: y,
    head: [["Dia", "Tomadas", "Esquecidas", "Adesão"]],
    body: stats.dayBuckets.map((b) => [b.label, b.taken, b.missed, `${b.adherence}%`]),
    headStyles: { fillColor: [14, 165, 233] },
    styles: { fontSize: 9 },
  });

  if (stats.topMissed.length > 0) {
    const ay = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
    doc.setFontSize(13);
    doc.text("Mais esquecidos", 14, ay);
    autoTable(doc, {
      startY: ay + 4,
      head: [["Medicamento", "Esquecimentos"]],
      body: stats.topMissed.map((m) => [m.name, m.count]),
      headStyles: { fillColor: [239, 68, 68] },
      styles: { fontSize: 9 },
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} • Página ${i}/${pageCount}`,
      14, 290,
    );
  }

  doc.save(`adesao-${periodLabel.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

function fmt(d: Date) {
  return d.toLocaleDateString("pt-BR");
}
