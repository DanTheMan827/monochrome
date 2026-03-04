// functions/playlist/[id].ts

import { BaseServerAPI } from '../_shared.ts';

interface PlaylistResponseData {
    title?: string;
    name?: string;
    numberOfTracks?: number;
    squareImage?: string;
    image?: string;
}

interface PlaylistApiResponse {
    playlist?: PlaylistResponseData;
    data?: PlaylistResponseData;
}

class ServerAPI extends BaseServerAPI {
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

    override getCoverUrl(id: string, size: string = '1080'): string {
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
