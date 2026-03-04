// functions/_shared.ts
// Shared interfaces and base class for Cloudflare Pages Functions

export interface UptimeApiItem {
    url?: string;
}

export interface UptimeResponse {
    api?: UptimeApiItem[];
}

const FALLBACK_INSTANCES: string[] = [
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

const UPTIME_URLS: string[] = [
    'https://tidal-uptime.jiffy-puffs-1j.workers.dev/',
    'https://tidal-uptime.props-76styles.workers.dev/',
];

export class BaseServerAPI {
    private apiInstances: string[] | null;

    constructor() {
        this.apiInstances = null;
    }

    async getInstances(): Promise<string[]> {
        if (this.apiInstances) return this.apiInstances;

        let data: UptimeResponse | null = null;
        const urls: string[] = [...UPTIME_URLS].sort((): number => Math.random() - 0.5);

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
        return FALLBACK_INSTANCES;
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

    getCoverUrl(id: string, size: string = '1280'): string {
        if (!id) return '';
        const formattedId: string = id.replace(/-/g, '/');
        return `https://resources.tidal.com/images/${formattedId}/${size}x${size}.jpg`;
    }
}
