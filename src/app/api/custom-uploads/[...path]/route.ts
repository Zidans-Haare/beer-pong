
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    // Security: Require authentication to access uploads
    const session = await auth();
    if (!session?.user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const { path: pathSegments } = await params;

        // Construct the file path
        const filePath = path.join(process.cwd(), 'user-uploads', ...pathSegments);

        // Security check
        const uploadsDir = path.join(process.cwd(), 'user-uploads');
        const relative = path.relative(uploadsDir, filePath);
        
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        const stat = await fs.promises.stat(filePath);
        const fileSize = stat.size;
        
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.webp') contentType = 'image/webp';
        
        const fileBuffer = await fs.promises.readFile(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': fileSize.toString(),
                'Cache-Control': 'private, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error); // Keep server-side error logging
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
