// functions/album/[id].ts

interface UptimeApiItem {
    url?: string;
}

interface UptimeResponse {
    api?: UptimeApiItem[];
}

interface AlbumResponseData {
    title?: string;
    name?: string;
    artist?: { name?: string };
    releaseDate?: string;
    numberOfTracks?: number;
    items?: unknown[];
    cover?: string;
    [key: string]: unknown;
}

interface AlbumApiResponse {
    data?: AlbumResponseData;
    album?: AlbumResponseData;
    tracks?: unknown[];
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

    async getAlbumMetadata(id: string): Promise<AlbumApiResponse> {
        try {
            const response: Response = await this.fetchWithRetry(`/album/${id}`);
            return (await response.json()) as AlbumApiResponse;
        } catch {
            const response: Response = await this.fetchWithRetry(`/album?id=${id}`);
            return (await response.json()) as AlbumApiResponse;
        }
    }

    getCoverUrl(id: string, size: string = '1280'): string {
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
    const albumId: string = params.id;

    if (isBot && albumId) {
        try {
            const api: ServerAPI = new ServerAPI();
            const data: AlbumApiResponse = await api.getAlbumMetadata(albumId);
            const album: AlbumResponseData = (data.data || data.album || data) as AlbumResponseData;
            const tracks: unknown[] = album.items || data.tracks || [];

            if (album && (album.title || album.name)) {
                const title: string = album.title || album.name || '';
                const artist: string = album.artist?.name || 'Unknown Artist';
                const year: number | string = album.releaseDate ? new Date(album.releaseDate).getFullYear() : '';
                const trackCount: number = album.numberOfTracks || tracks.length;

                const description: string = `Album by ${artist} • ${year} • ${trackCount} Tracks\nListen on Monochrome`;
                const imageUrl: string = album.cover
                    ? api.getCoverUrl(album.cover, '1280')
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
                        <meta property="og:type" content="music.album">
                        <meta property="og:url" content="${pageUrl}">
                        <meta property="music:musician" content="${artist}">
                        <meta property="music:release_date" content="${album.releaseDate}">
                        
                        <meta name="twitter:card" content="summary_large_image">
                        <meta name="twitter:title" content="${title}">
                        <meta name="twitter:description" content="${description}">
                        <meta name="twitter:image" content="${imageUrl}">
                    </head>
                    <body>
                        <h1>${title}</h1>
                        <p>${description}</p>
                        <img src="${imageUrl}" alt="Album Cover">
                    </body>
                    </html>
                `;

                return new Response(metaHtml, { headers: { 'content-type': 'text/html;charset=UTF-8' } });
            }
        } catch (error: unknown) {
            console.error(`Error for album ${albumId}:`, error);
        }
    }

    const url: URL = new URL(request.url);
    url.pathname = '/';
    return env.ASSETS.fetch(new Request(url, request));
}
