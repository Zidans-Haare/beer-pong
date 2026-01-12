
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const { path: pathSegments } = await params;
    
    // Construct the file path
    const filePath = path.join(process.cwd(), 'user-uploads', ...pathSegments);

    // Security check: Ensure the path is within user-uploads
    const uploadsDir = path.join(process.cwd(), 'user-uploads');
    const relative = path.relative(uploadsDir, filePath);
    
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    try {
        const stats = fs.statSync(filePath);
        const fileStream = fs.createReadStream(filePath);
        
        // Determine content type
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        else if (ext === '.webp') contentType = 'image/webp';
        else if (ext === '.bmp') contentType = 'image/bmp';
        else if (ext === '.tiff' || ext === '.tif') contentType = 'image/tiff';
        else if (ext === '.ico') contentType = 'image/x-icon';
        else if (ext === '.heic') contentType = 'image/heic';
        else if (ext === '.heif') contentType = 'image/heif';

        // Convert Node.js stream to Web Stream
        const webStream = new ReadableStream({
            start(controller) {
                fileStream.on('data', (chunk) => controller.enqueue(chunk));
                fileStream.on('end', () => controller.close());
                fileStream.on('error', (err) => controller.error(err));
            }
        });

        return new NextResponse(webStream, {
            headers: {
                'Content-Type': contentType,
                'Content-Length': stats.size.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (error) {
        console.error('Error serving file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
