'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getUploadDir } from '@/lib/uploads';

export async function getPlayers() {
    try {
        const players = await prisma.player.findMany({
            orderBy: { name: 'asc' },
        });
        return players;
    } catch (error) {
        console.error('Failed to fetch players:', error);
        throw new Error('Failed to fetch players');
    }
}

export async function createPlayer(formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    const name = formData.get('name') as string;
    const nickname = formData.get('nickname') as string;
    const email = formData.get('email') as string;
    const image = formData.get('image') as string;
    const bio = formData.get('bio') as string;
    const motto = formData.get('motto') as string;

    if (!name) {
        return { success: false, error: 'Name is required' };
    }

    try {
        await prisma.player.create({
            data: {
                name,
                nickname: nickname || null,
                email: email || null,
                image: image || null,
                bio: bio || null,
                motto: motto || null,
            },
        });
        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to create player:', error);
        return { success: false, error: 'Failed to create player' };
    }
}

import { auth } from '@/auth';
import { isAdmin } from '@/lib/admin';
// ... existing createPlayer ...

export async function updatePlayer(id: string, formData: FormData) {
    const session = await auth();
    const player = await prisma.player.findUnique({ where: { id } });

    if (!player) return { success: false, error: 'Spieler nicht gefunden' };

    // Authorization: Only owner can edit
    if (session?.user?.id !== player.userId && !isAdmin(session?.user?.email)) {
        return { success: false, error: 'Keine Berechtigung' };
    }

    const name = formData.get('name') as string;
    const nickname = formData.get('nickname') as string;
    const email = formData.get('email') as string;
    const bio = formData.get('bio') as string;
    const motto = formData.get('motto') as string;

    const imageFile = formData.get('image');
    const imageData = formData.get('imageData') as string | null;
    let imagePath = player.image;

    // Handle base64 image data from camera
    if (imageData) {
        if (imageData === '') {
            // Image was removed
            imagePath = null;
        } else if (imageData.startsWith('data:image/')) {
            try {
                const fs = require('fs');
                const path = require('path');

                // Extract base64 data
                const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');

                // Validate size (max 2MB for base64)
                if (buffer.length > 2 * 1024 * 1024) {
                    return { success: false, error: 'Bild zu groß (max 2MB)' };
                }

                const filename = `${player.id}-${Date.now()}.jpg`;
                const uploadDir = getUploadDir();

                fs.writeFileSync(path.join(uploadDir, filename), buffer);
                imagePath = `/uploads/${filename}`;
            } catch (e) {
                console.error('Camera image save failed', e);
                return { success: false, error: 'Bild konnte nicht gespeichert werden' };
            }
        }
    }
    // Handle File Upload (fallback for traditional file input)
    else if (imageFile && imageFile instanceof File && imageFile.size > 0) {
        // Basic validation
        if (!imageFile.type.startsWith('image/')) {
            return { success: false, error: 'Nur Bilder erlaubt' };
        }
        if (imageFile.size > 5 * 1024 * 1024) {
            return { success: false, error: 'Bild zu groß (max 5MB)' };
        }

        try {
            const buffer = Buffer.from(await imageFile.arrayBuffer());
            const filename = `${player.id}-${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const fs = require('fs');
            const path = require('path');
            const uploadDir = getUploadDir();

            fs.writeFileSync(path.join(uploadDir, filename), buffer);
            imagePath = `/uploads/${filename}`;
        } catch (e) {
            console.error('File upload failed', e);
            return { success: false, error: 'Bild konnte nicht hochgeladen werden' };
        }
    }

    try {
        await prisma.player.update({
            where: { id },
            data: {
                name,
                nickname: nickname || null,
                email: email || null,
                image: imagePath || null,
                bio: bio || null,
                motto: motto || null,
            }
        });
        revalidatePath(`/players/${id}`);
        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to update player:', error);
        return { success: false, error: 'Update fehlgeschlagen' };
    }
}

export async function deletePlayer(playerId: string) {
    const session = await auth();
    if (!session?.user?.id) {
        return { success: false, error: 'Nicht eingeloggt' };
    }

    try {
        const player = await prisma.player.findUnique({ where: { id: playerId } });
        if (!player) {
            return { success: false, error: 'Spieler nicht gefunden' };
        }

        // Authorization: Only owner or admin can delete
        if (player.userId !== session.user.id && !isAdmin(session.user.email)) {
            return { success: false, error: 'Keine Berechtigung' };
        }

        await prisma.player.delete({ where: { id: playerId } });
        revalidatePath('/players');
        return { success: true };
    } catch (error) {
        console.error('Failed to delete player:', error);
        return { success: false, error: 'Spieler konnte nicht gelöscht werden (evtl. existieren noch Matches)' };
    }
}
