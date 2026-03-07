// functions/artist/[id].ts

import { BaseServerAPI } from '../_shared.ts';

interface ArtistResponseData {
    name?: string;
    title?: string;
    picture?: string;
}

interface ArtistApiResponse {
    artist?: ArtistResponseData;
    data?: ArtistResponseData;
}

class ServerAPI extends BaseServerAPI {
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
    const isBot: boolean =
        /discordbot|twitterbot|facebookexternalhit|bingbot|googlebot|slurp|whatsapp|pinterest|slackbot/i.test(
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
