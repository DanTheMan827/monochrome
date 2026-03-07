// functions/album/[id].ts

import { BaseServerAPI } from '../_shared.ts';

interface AlbumResponseData {
    title?: string;
    name?: string;
    artist?: { name?: string };
    releaseDate?: string;
    numberOfTracks?: number;
    items?: unknown[];
    cover?: string;
}

interface AlbumApiResponse {
    data?: AlbumResponseData;
    album?: AlbumResponseData;
    tracks?: unknown[];
}

class ServerAPI extends BaseServerAPI {
    async getAlbumMetadata(id: string): Promise<AlbumApiResponse> {
        try {
            const response: Response = await this.fetchWithRetry(`/album/${id}`);
            return (await response.json()) as AlbumApiResponse;
        } catch {
            const response: Response = await this.fetchWithRetry(`/album?id=${id}`);
            return (await response.json()) as AlbumApiResponse;
        }
    }
}

export async function onRequest(context: CFContext): Promise<Response> {
    const { request, params, env } = context;
    const userAgent: string = request.headers.get('User-Agent') || '';
    const isBot: boolean =
        /discordbot|twitterbot|facebookexternalhit|bingbot|googlebot|slurp|whatsapp|pinterest|slackbot/i.test(
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
