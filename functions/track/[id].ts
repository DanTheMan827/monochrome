// functions/track/[id].ts

interface UptimeApiItem {
    url?: string;
}

interface UptimeResponse {
    api?: UptimeApiItem[];
}

interface TrackInfoItem {
    id?: string | number;
    item?: TrackInfoItem;
    title?: string;
    version?: string;
    artists?: Array<{ name?: string }>;
    album?: { title?: string; cover?: string };
    duration?: number;
    previewUrl?: string;
    previewURL?: string;
    [key: string]: unknown;
}

interface TrackInfoResponse {
    data?: TrackInfoItem | TrackInfoItem[];
    [key: string]: unknown;
}

interface TrackMetadata {
    title?: string;
    version?: string;
    artists?: Array<{ name?: string }>;
    album: { title: string; cover: string };
    duration: number;
    previewUrl?: string;
    previewURL?: string;
    [key: string]: unknown;
}

interface StreamResponse {
    url?: string;
    streamUrl?: string;
}

function getTrackTitle(
    track: { title?: string; version?: string },
    { fallback = 'Unknown Title' }: { fallback?: string } = {}
): string {
    if (!track?.title) return fallback;
    return track?.version ? `${track.title} (${track.version})` : track.title;
}

function getTrackArtists(
    track: { artists?: Array<{ name?: string }> } = {},
    { fallback = 'Unknown Artist' }: { fallback?: string } = {}
): string {
    if (track?.artists?.length) {
        return track.artists.map((artist: { name?: string }) => artist?.name).join(', ');
    }
    return fallback;
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

    async getTrackMetadata(id: string): Promise<TrackMetadata> {
        const response: Response = await this.fetchWithRetry(`/info/?id=${id}`);
        const json = (await response.json()) as TrackInfoResponse;
        const data: TrackInfoItem | TrackInfoItem[] = (json.data || json) as TrackInfoItem | TrackInfoItem[];
        const items: TrackInfoItem[] = Array.isArray(data) ? data : [data];
        const found: TrackInfoItem | undefined = items.find(
            (i: TrackInfoItem) => i.id == id || (i.item && i.item.id == id)
        );
        if (found) {
            return (found.item || found) as TrackMetadata;
        }
        throw new Error('Track metadata not found');
    }

    getCoverUrl(id: string, size: string = '1280'): string {
        if (!id) return '';
        const formattedId: string = id.replace(/-/g, '/');
        return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
    }

    async getStreamUrl(id: string): Promise<string | undefined> {
        const response: Response = await this.fetchWithRetry(`/stream?id=${id}&quality=LOW`);
        const data = (await response.json()) as StreamResponse;
        return data.url || data.streamUrl;
    }
}

export async function onRequest(context: CFContext): Promise<Response> {
    const { request, params, env } = context;
    const userAgent: string = request.headers.get('User-Agent') || '';
    const isBot: boolean = /discordbot|twitterbot|facebookexternalhit|bingbot|googlebot|slurp|whatsapp|pinterest|slackbot/i.test(
        userAgent
    );
    const trackId: string = params.id;

    if (isBot && trackId) {
        try {
            const api: ServerAPI = new ServerAPI();
            const track: TrackMetadata = await api.getTrackMetadata(trackId);

            if (track) {
                const title: string = getTrackTitle(track);
                const artist: string = getTrackArtists(track);
                const description: string = `${artist} - ${track.album.title}`;
                const imageUrl: string = api.getCoverUrl(track.album.cover, '1280');
                const trackUrl: string = new URL(request.url).href;

                let audioUrl: string | undefined = track.previewUrl || track.previewURL;

                if (!audioUrl) {
                    try {
                        audioUrl = await api.getStreamUrl(trackId);
                    } catch (e: unknown) {
                        console.error('Failed to fetch stream fallback:', e);
                    }
                }
                // this prob wont work im js winging it
                const audioMeta: string = audioUrl
                    ? `
                    <meta property="og:audio" content="${audioUrl}">
                    <meta property="og:audio:type" content="audio/mp4">
                    <meta property="og:video" content="${audioUrl}">
                    <meta property="og:video:type" content="audio/mp4">
                `
                    : '';

                const metaHtml: string = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>${title} by ${artist}</title>
                        <meta name="description" content="${description}">
                        
                        <meta property="og:title" content="${title}">
                        <meta property="og:description" content="${description}">
                        <meta property="og:image" content="${imageUrl}">
                        <meta property="og:type" content="music.song">
                        <meta property="og:url" content="${trackUrl}">
                        <meta property="music:duration" content="${track.duration}">
                        <meta property="music:album" content="${track.album.title}">
                        <meta property="music:musician" content="${artist}">
                        
                        ${audioMeta}
                        
                        <meta name="twitter:card" content="summary_large_image">
                        <meta name="twitter:title" content="${title}">
                        <meta name="twitter:description" content="${description}">
                        <meta name="twitter:image" content="${imageUrl}">

                        <meta name="theme-color" content="#000000">
                    </head>
                    <body>
                        <h1>${title}</h1>
                        <p>by ${artist}</p>
                    </body>
                    </html>
                `;

                return new Response(metaHtml, {
                    headers: { 'content-type': 'text/html;charset=UTF-8' },
                });
            }
        } catch (error: unknown) {
            console.error(`Error generating meta tags for track ${trackId}:`, error);
        }
    }

    const url: URL = new URL(request.url);
    url.pathname = '/';
    return env.ASSETS.fetch(new Request(url, request));
}
