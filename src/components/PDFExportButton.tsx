import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Record {
  name: string | null;
  email: string;
  branch: string;
  attendance_type: string;
  stream_title: string;
  duration_seconds: number;
  timestamp: string;
  age_category?: string | null;
  family_surname?: string | null;
  family_adult_count?: number | null;
  family_young_adult_count?: number | null;
  family_youth_count?: number | null;
  family_children_count?: number | null;
}

interface Props {
  records: Record[];
  branchName?: string;
  serviceTitle?: string;
}

const PDFExportButton = ({ records, branchName, serviceTitle }: Props) => {
  const [exporting, setExporting] = useState(false);

  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Deeper Life Bible Church', 105, 15, { align: 'center' });
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Attendance Report', 105, 22, { align: 'center' });

      let y = 30;
      if (branchName) { doc.text(`Branch: ${branchName}`, 14, y); y += 6; }
      if (serviceTitle) { doc.text(`Service: ${serviceTitle}`, 14, y); y += 6; }
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, y); y += 6;
      doc.text(`Total Records: ${records.length}`, 14, y); y += 8;

      const formatDuration = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      autoTable(doc, {
        startY: y,
        head: [['Name', 'Email', 'Branch', 'Type', 'Duration', 'Date']],
        body: records.map(r => [
          r.family_surname || r.name || 'Family',
          r.email,
          r.branch,
          r.attendance_type,
          formatDuration(r.duration_seconds),
          new Date(r.timestamp).toLocaleDateString(),
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 58, 95] },
      });

      doc.save(`dlbc-attendance-${new Date().toISOString().split('T')[0]}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={exportPDF} disabled={records.length === 0 || exporting}>
      {exporting ? <LoadingSpinner size="sm" className="text-current" /> : null}
      {exporting ? 'Exporting...' : 'Export PDF'}
    </Button>
  );
};

export default PDFExportButton;
