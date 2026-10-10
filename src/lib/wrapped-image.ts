// Speichern und Teilen der Wrapped-Bilder und -Videos.

export function canvasToFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(new File([blob], filename, { type: 'image/png' })) : reject(new Error('Bild konnte nicht erzeugt werden')), 'image/png'));
}

// Teilen-Menü (Handy: "Sichern" legt Bild oder Video in die Galerie), sonst Download
export async function saveFiles(files: File[], title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
    if (typeof navigator !== 'undefined' && navigator.canShare?.({ files })) {
        try {
            await navigator.share({ files, title });
            return 'shared';
        } catch (error) {
            if ((error as Error).name === 'AbortError') return 'cancelled';
        }
    }
    for (const file of files) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        await new Promise(r => setTimeout(r, 250));
    }
    return 'downloaded';
}
