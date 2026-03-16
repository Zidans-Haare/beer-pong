import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: 'Nicht eingeloggt' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
        return NextResponse.json({ error: 'Keine Datei' }, { status: 400 });
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
        return NextResponse.json({ error: 'Nur Bilder erlaubt' }, { status: 400 });
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: 'Bild zu groß (max. 5 MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!allowedExts.includes(ext)) {
        return NextResponse.json({ error: 'Format nicht unterstützt' }, { status: 400 });
    }

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'tournaments');
    const filePath = join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({ url: `/uploads/tournaments/${filename}` });
}
