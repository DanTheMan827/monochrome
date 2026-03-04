// functions/artist/[id].ts

interface UptimeApiItem {
    url?: string;
}

interface UptimeResponse {
    api?: UptimeApiItem[];
}

interface ArtistResponseData {
    name?: string;
    title?: string;
    picture?: string;
}

interface ArtistApiResponse {
    artist?: ArtistResponseData;
    data?: ArtistResponseData;
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

    async getArtistMetadata(id: string): Promise<ArtistApiResponse> {
        try {
            const response: Response = await this.fetchWithRetry(`/artist/${id}`);
            return (await response.json()) as ArtistApiResponse;
        } catch {
            const response: Response = await this.fetchWithRetry(`/artist?id=${id}`);
            return (await response.json()) as ArtistApiResponse;
        }
    }

    getArtistPictureUrl(id: string, size: string = '750'): string {
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
    const artistId: string = params.id;

    if (isBot && artistId) {
        try {
            const api: ServerAPI = new ServerAPI();
            const data: ArtistApiResponse = await api.getArtistMetadata(artistId);
            const artist: ArtistResponseData = (data.artist || data.data || data) as ArtistResponseData;

            if (artist && (artist.name || artist.title)) {
                const name: string = artist.name || artist.title || '';
                const description: string = `Listen to ${name} on Monochrome`;
                const imageUrl: string = artist.picture
                    ? api.getArtistPictureUrl(artist.picture, '750')
                    : 'https://monochrome.samidy.com/assets/appicon.png';
                const pageUrl: string = new URL(request.url).href;

                const metaHtml: string = `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <title>${name}</title>
                        <meta name="description" content="${description}">
                        <meta name="theme-color" content="#000000">
                        
                        <meta property="og:site_name" content="Monochrome">
                        <meta property="og:title" content="${name}">
                        <meta property="og:description" content="${description}">
                        <meta property="og:image" content="${imageUrl}">
                        <meta property="og:type" content="profile">
                        <meta property="og:url" content="${pageUrl}">
                        
                        <meta name="twitter:card" content="summary_large_image">
                        <meta name="twitter:title" content="${name}">
                        <meta name="twitter:description" content="${description}">
                        <meta name="twitter:image" content="${imageUrl}">
                    </head>
                    <body>
                        <h1>${name}</h1>
                        <img src="${imageUrl}" alt="Artist Picture">
                    </body>
                    </html>
                `;

                return new Response(metaHtml, { headers: { 'content-type': 'text/html;charset=UTF-8' } });
            }
        } catch (error: unknown) {
            console.error(`Error for artist ${artistId}:`, error);
        }
    }

    const url: URL = new URL(request.url);
    url.pathname = '/';
    return env.ASSETS.fetch(new Request(url, request));
}
