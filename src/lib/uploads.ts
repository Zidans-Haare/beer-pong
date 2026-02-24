import path from 'path';
import fs from 'fs';

export function getUploadDir(): string {
    const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'user-uploads');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}
