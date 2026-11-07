import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { buildStatsWorkbook } from '@/lib/stats-export';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Excel-Export der gesamten Statistik (nur für angemeldete Nutzer)
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    try {
        const buffer = await buildStatsWorkbook();
        const filename = `bierpong-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Stats export failed:', error);
        return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 });
    }
}
