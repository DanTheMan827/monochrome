// functions/playlist/[id].ts

interface UptimeApiItem {
    url?: string;
}

interface UptimeResponse {
    api?: UptimeApiItem[];
}

interface PlaylistResponseData {
    title?: string;
    name?: string;
    numberOfTracks?: number;
    squareImage?: string;
    image?: string;
    [key: string]: unknown;
}

interface PlaylistApiResponse {
    playlist?: PlaylistResponseData;
    data?: PlaylistResponseData;
    [key: string]: unknown;
}

class ServerAPI {
    private readonly INSTANCES_URLS: string[];
    private apiInstances: string[] | null;

    constructor() {
        this.INSTANCES_URLS = [
            'https://tidal-uptime.jiffy-puffs-1j.workers.dev/',
            'https://tidal-uptime.props-76styles.workers.dev/',
        ];
        this.apiInstances = null;
    }

    async getInstances(): Promise<string[]> {
        if (this.apiInstances) return this.apiInstances;

        let data: UptimeResponse | null = null;
        const urls: string[] = [...this.INSTANCES_URLS].sort((): number => Math.random() - 0.5);

        for (const url of urls) {
            try {
                const response: Response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                data = (await response.json()) as UptimeResponse;
                break;
            } catch (error: unknown) {
                console.warn(`Failed to fetch from ${url}:`, error);
            }
        }

        if (data) {
            const instances: string[] = (data.api || [])
                .map((item: UptimeApiItem): string => item.url ?? '')
                .filter((url: string): boolean => url !== '' && !url.includes('spotisaver.net'));
            this.apiInstances = instances;
            return instances;
        }

        console.error('Failed to load instances from all uptime APIs');
        return [
            'https://eu-central.monochrome.tf',
            'https://us-west.monochrome.tf',
            'https://arran.monochrome.tf',
            'https://triton.squid.wtf',
            'https://api.monochrome.tf',
            'https://monochrome-api.samidy.com',
            'https://maus.qqdl.site',
            'https://vogel.qqdl.site',
            'https://katze.qqdl.site',
            'https://hund.qqdl.site',
            'https://tidal.kinoplus.online',
            'https://wolf.qqdl.site',
        ];
    }

    async fetchWithRetry(relativePath: string): Promise<Response> {
        const instances: string[] = await this.getInstances();
        if (instances.length === 0) {
            throw new Error('No API instances configured.');
        }

        let lastError: unknown = null;
        for (const baseUrl of instances) {
            const url: string = baseUrl.endsWith('/') ? `${baseUrl}${relativePath.substring(1)}` : `${baseUrl}${relativePath}`;
            try {
                const response: Response = await fetch(url);
                if (response.ok) {
                    return response;
                }
                lastError = new Error(`Request failed with status ${response.status}`);
            } catch (error: unknown) {
                lastError = error;
            }
        }
        throw lastError || new Error(`All API instances failed for: ${relativePath}`);
    }

    async getPlaylistMetadata(id: string): Promise<PlaylistApiResponse> {
        try {
            const response: Response = await this.fetchWithRetry(`/playlist/${id}`);
            return (await response.json()) as PlaylistApiResponse;
        } catch {
            // Fallback to query param style
            const response: Response = await this.fetchWithRetry(`/playlist?id=${id}`);
            return (await response.json()) as PlaylistApiResponse;
        }
    }

    getCoverUrl(id: string, size: string = '1080'): string {
        if (!id) return '';
        const formattedId: string = id.replace(/-/g, '/');
        return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
    }
}

export async function onRequest(context: CFContext): Promise<Response> {
    const { request, params, env } = context;
    const userAgent: string = request.headers.get('User-Agent') || '';
    const isBot: boolean = /discordbot|twitterbot|facebookexternalhit|bingbot|googlebot|slurp|whatsapp|pinterest|slackbot/i.test(
        userAgent
    );
    const playlistId: string = params.id;

    if (isBot && playlistId) {
        try {
            const api: ServerAPI = new ServerAPI();
            const data: PlaylistApiResponse = await api.getPlaylistMetadata(playlistId);
            const playlist: PlaylistResponseData = (data.playlist || data.data || data) as PlaylistResponseData;

            if (playlist && (playlist.title || playlist.name)) {
                const title: string = playlist.title || playlist.name || '';
                const trackCount: number | undefined = playlist.numberOfTracks;
                const description: string = `Playlist • ${trackCount} Tracks\nListen on Monochrome`;
                const imageId: string | undefined = playlist.squareImage || playlist.image;
                const imageUrl: string = imageId
                    ? api.getCoverUrl(imageId, '1080')
                    : 'https://monochrome.samidy.com/assets/appicon.png';
                const pageUrl: string = new URL(request.url).href;

                const metaHtml: string = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>${title}</title>
                        <meta name="description" content="${description}">
                        <meta name="theme-color" content="#000000">
                        
                        <meta property="og:site_name" content="Monochrome">
                        <meta property="og:title" content="${title}">
                        <meta property="og:description" content="${description}">
                        <meta property="og:image" content="${imageUrl}">
                        <meta property="og:type" content="music.playlist">
                        <meta property="og:url" content="${pageUrl}">
                        <meta property="music:song_count" content="${trackCount}">
                        
                        <meta name="twitter:card" content="summary_large_image">
                        <meta name="twitter:title" content="${title}">
                        <meta name="twitter:description" content="${description}">
                        <meta name="twitter:image" content="${imageUrl}">
                    </head>
                    <body>
                        <h1>${title}</h1>
                        <p>${description}</p>
                        <img src="${imageUrl}" alt="Playlist Cover">
                    </body>
                    </html>
                `;

                return new Response(metaHtml, { headers: { 'content-type': 'text/html;charset=UTF-8' } });
            }
        } catch (error: unknown) {
            console.error(`Error for playlist ${playlistId}:`, error);
        }
    }

    const url: URL = new URL(request.url);
    url.pathname = '/';
    return env.ASSETS.fetch(new Request(url, request));
}
