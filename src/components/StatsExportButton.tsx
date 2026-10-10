import { Download } from 'lucide-react';

// Lädt die komplette Statistik als Excel-Datei (wird auf dem Server erzeugt)
export default function StatsExportButton({ label }: { label: string }) {
    return (
        <a href="/api/stats/export" download className="btn btn-secondary stats-export-button">
            <Download size={18} aria-hidden="true" />
            {label}
        </a>
    );
}
