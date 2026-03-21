import pkg from '../../package.json';

const CURRENT_VERSION = pkg.version;
const GITHUB_REPO = 'Zidans-Haare/beer-pong';

export interface UpdateInfo {
    hasUpdate: boolean;
    latestVersion: string;
    currentVersion: string;
    releaseUrl: string;
}

export async function checkForUpdate(): Promise<UpdateInfo | null> {
    try {
        const res = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
            {
                next: { revalidate: 3600 }, // cache 1h
                headers: { Accept: 'application/vnd.github+json' },
            }
        );
        if (!res.ok) return null;

        const data = await res.json();
        const latestVersion = (data.tag_name as string)?.replace(/^v/, '');
        if (!latestVersion) return null;

        return {
            hasUpdate: latestVersion !== CURRENT_VERSION,
            latestVersion,
            currentVersion: CURRENT_VERSION,
            releaseUrl: data.html_url as string,
        };
    } catch {
        return null;
    }
}
