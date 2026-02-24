
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getUploadDir } from '@/lib/uploads';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    try {
        const { path: pathSegments } = await params;
        
        console.log('DEBUG UPLOAD: Called with path:', pathSegments);

        const uploadsDir = getUploadDir();
        const filePath = path.join(uploadsDir, ...pathSegments);
        const relative = path.relative(uploadsDir, filePath);
        
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
             console.log('DEBUG UPLOAD: Forbidden access');
            return new NextResponse('Forbidden', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
            console.log('DEBUG UPLOAD: File not found on disk');
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
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
