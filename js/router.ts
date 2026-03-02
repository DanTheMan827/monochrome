//router.ts
import { getTrackArtists } from './utils.ts';
import { loadProfile } from './profile.ts';

interface RouterUI {
    renderSearchPage(query: string): Promise<void>;
    renderAlbumPage(id: string, provider: string | null): Promise<void>;
    renderArtistPage(id: string, provider: string | null): Promise<void>;
    renderPlaylistPage(id: string, source: string, provider?: string | null): Promise<void>;
    renderFolderPage(param: string): Promise<void>;
    renderMixPage(id: string, provider: string | null): Promise<void>;
    renderTrackerTrackPage(id: string): Promise<void>;
    renderTrackPage(id: string, provider: string | null): Promise<void>;
    renderLibraryPage(): Promise<void>;
    renderRecentPage(): Promise<void>;
    renderTrackerProjectPage(sheetId: string, projectName: string): Promise<void>;
    renderTrackerArtistPage(sheetId: string): Promise<void>;
    renderUnreleasedPage(): Promise<void>;
    renderHomePage(): Promise<void>;
    showPage(pageId: string): void;
}

interface RouterPlayer {
    currentTrack: TrackData | null;
}

interface ProviderResult {
    provider: string | null;
    id: string;
}

export function navigate(path: string): void {
    if (path === window.location.pathname) {
        return;
    }
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
}

export function createRouter(ui: RouterUI): () => Promise<void> {
    const router = async (): Promise<void> => {
        if (window.location.hash && window.location.hash.length > 1) {
            const hash: string = window.location.hash.substring(1);
            if (hash.includes('/')) {
                const newPath: string = hash.startsWith('/') ? hash : '/' + hash;
                window.history.replaceState(null, '', newPath);
            }
        }

        let path: string = window.location.pathname;

        if (path.startsWith('/')) path = path.substring(1);
        if (path.endsWith('/')) path = path.substring(0, path.length - 1);
        if (path === '' || path === 'index.html') path = 'home';

        const parts: string[] = path.split('/');
        const page: string = parts[0];
        const param: string = parts.slice(1).join('/');

        // Helper to extract provider prefix and ID from params
        // Supports formats like: /track/t/123 (Tidal), /track/q/123 (Qobuz), /track/123 (default)
        const extractProviderAndId = (p: string): ProviderResult => {
            if (p.startsWith('t/')) {
                return { provider: 'tidal', id: p.slice(2) };
            }
            if (p.startsWith('q/')) {
                return { provider: 'qobuz', id: p.slice(2) };
            }
            return { provider: null, id: p };
        };

        switch (page) {
            case 'search':
                await ui.renderSearchPage(decodeURIComponent(param));
                break;
            case 'album': {
                const { provider, id } = extractProviderAndId(param);
                await ui.renderAlbumPage(id, provider);
                break;
            }
            case 'artist': {
                const { provider, id } = extractProviderAndId(param);
                await ui.renderArtistPage(id, provider);
                break;
            }
            case 'playlist': {
                const { provider, id } = extractProviderAndId(param);
                await ui.renderPlaylistPage(id, 'api', provider);
                break;
            }
            case 'userplaylist':
                await ui.renderPlaylistPage(param, 'user');
                break;
            case 'folder':
                await ui.renderFolderPage(param);
                break;
            case 'mix': {
                const { provider, id } = extractProviderAndId(param);
                await ui.renderMixPage(id, provider);
                break;
            }
            case 'track': {
                const { provider, id } = extractProviderAndId(param);
                if (id.startsWith('tracker-')) {
                    await ui.renderTrackerTrackPage(id);
                } else {
                    await ui.renderTrackPage(id, provider);
                }
                break;
            }
            case 'library':
                await ui.renderLibraryPage();
                break;
            case 'recent':
                await ui.renderRecentPage();
                break;
            case 'unreleased':
                if (param) {
                    const unreleasedParts: string[] = param.split('/');
                    const sheetId: string = unreleasedParts[0];
                    const projectName: string | null = unreleasedParts[1] ? decodeURIComponent(unreleasedParts[1]) : null;
                    if (projectName) {
                        await ui.renderTrackerProjectPage(sheetId, projectName);
                    } else {
                        await ui.renderTrackerArtistPage(sheetId);
                    }
                } else {
                    await ui.renderUnreleasedPage();
                }
                break;
            case 'home':
                await ui.renderHomePage();
                break;
            case 'user':
                if (param && param.startsWith('@') && !param.includes('/')) {
                    await loadProfile(decodeURIComponent(param.slice(1)));
                }
                break;
            default:
                ui.showPage(page);
                break;
        }
    };

    return router;
}

export function updateTabTitle(player: RouterPlayer): void {
    if (player.currentTrack) {
        const track: TrackData = player.currentTrack;
        document.title = `${track.title} • ${getTrackArtists(track)}`;
    } else {
        const path: string = window.location.pathname;
        if (path.startsWith('/album/') || path.startsWith('/playlist/') || path.startsWith('/track/')) {
            return;
        }
        document.title = 'Monochrome Music';
    }
}
