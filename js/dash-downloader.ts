interface DashSegment {
    number: number;
    time: number;
}

interface DashManifest {
    baseUrl: string;
    initialization: string | null;
    media: string | null;
    segments: DashSegment[];
    repId: string | null;
    mimeType: string | null;
}

interface DashDownloadProgress {
    stage: string;
    receivedBytes: number;
    totalBytes: number | undefined;
    currentSegment: number;
    totalSegments: number;
}

interface DashDownloadOptions {
    onProgress?: (progress: DashDownloadProgress) => void;
    signal?: AbortSignal;
}

export class DashDownloader {
    constructor() {}

    async downloadDashStream(manifestBlobUrl: string, options: DashDownloadOptions = {}): Promise<Blob> {
        const { onProgress, signal } = options;

        // 1. Fetch and Parse Manifest
        const response = await fetch(manifestBlobUrl);
        const manifestText = await response.text();

        const manifest = this.parseManifest(manifestText);
        if (!manifest) {
            throw new Error('Failed to parse DASH manifest');
        }

        // 2. Generate URLs
        const urls = this.generateSegmentUrls(manifest);
        const mimeType = manifest.mimeType || 'audio/mp4';

        // 3. Download Segments
        const chunks: ArrayBuffer[] = [];
        let downloadedBytes = 0;
        // Estimate total size? Hard to know exactly without Content-Length of each.
        // We can just track progress by segment count.
        const totalSegments = urls.length;

        for (let i = 0; i < urls.length; i++) {
            if (signal?.aborted) throw new Error('AbortError');

            const url = urls[i];
            const segmentResponse = await fetch(url, { signal });

            if (!segmentResponse.ok) {
                // Retry once?
                console.warn(`Failed to fetch segment ${i}, retrying...`);
                await new Promise((r) => setTimeout(r, 1000));
                const retryResponse = await fetch(url, { signal });
                if (!retryResponse.ok) throw new Error(`Failed to fetch segment ${i}: ${retryResponse.status}`);
                const chunk = await retryResponse.arrayBuffer();
                chunks.push(chunk);
                downloadedBytes += chunk.byteLength;
            } else {
                const chunk = await segmentResponse.arrayBuffer();
                chunks.push(chunk);
                downloadedBytes += chunk.byteLength;
            }

            if (onProgress) {
                onProgress({
                    stage: 'downloading',
                    receivedBytes: downloadedBytes, // accurate byte count
                    totalBytes: undefined, // Unknown total
                    currentSegment: i + 1,
                    totalSegments: totalSegments,
                });
            }
        }

        // 4. Concatenate
        return new Blob(chunks, { type: mimeType });
    }

    parseManifest(manifestText: string): DashManifest {
        const parser = new DOMParser();
        const xml = parser.parseFromString(manifestText, 'text/xml');

        const mpd = xml.querySelector('MPD');
        if (!mpd) throw new Error('Invalid DASH manifest: No MPD tag');

        const period = mpd.querySelector('Period');
        if (!period) throw new Error('Invalid DASH manifest: No Period tag');

        // Prefer highest bandwidth audio adaptation set
        const adaptationSets = Array.from(period.querySelectorAll('AdaptationSet'));

        adaptationSets.sort((a: Element, b: Element) => {
            const getMaxBandwidth = (set: Element): number => {
                const reps: Element[] = Array.from(set.querySelectorAll('Representation'));
                return reps.length ? Math.max(...reps.map((r: Element) => parseInt(r.getAttribute('bandwidth') || '0', 10))) : 0;
            };
            return getMaxBandwidth(b) - getMaxBandwidth(a);
        });

        let audioSet: Element | undefined = adaptationSets.find((as: Element) => as.getAttribute('mimeType')?.startsWith('audio'));

        // Fallback: look for any adaptation set if mimeType is missing (rare)
        if (!audioSet && adaptationSets.length > 0) audioSet = adaptationSets[0];
        if (!audioSet) throw new Error('No AdaptationSet found');

        // Find Representation
        // Get all representations and sort by bandwidth descending
        const representations: Element[] = Array.from(audioSet.querySelectorAll('Representation')).sort((a: Element, b: Element) => {
            const bwA: number = parseInt(a.getAttribute('bandwidth') || '0');
            const bwB: number = parseInt(b.getAttribute('bandwidth') || '0');
            return bwB - bwA;
        });

        if (representations.length === 0) throw new Error('No Representation found');
        const rep = representations[0];
        const repId = rep.getAttribute('id');

        // Find SegmentTemplate
        // Can be in Representation or AdaptationSet
        const segmentTemplate = rep.querySelector('SegmentTemplate') || audioSet.querySelector('SegmentTemplate');
        if (!segmentTemplate) throw new Error('No SegmentTemplate found');

        const initialization = segmentTemplate.getAttribute('initialization');
        const media = segmentTemplate.getAttribute('media');
        const startNumber = parseInt(segmentTemplate.getAttribute('startNumber') || '1', 10);

        // BaseURL
        // Can be at MPD, Period, AdaptationSet, or Representation level.
        // We strictly need to find the "deepest" one or combine them?
        // Usually simpler manifests have it at one level.
        // Let's resolve closest BaseURL.
        const baseUrlTag =
            rep.querySelector('BaseURL') ||
            audioSet.querySelector('BaseURL') ||
            period.querySelector('BaseURL') ||
            mpd.querySelector('BaseURL');
        const baseUrl: string = baseUrlTag?.textContent?.trim() ?? '';

        // SegmentTimeline
        const segmentTimeline = segmentTemplate.querySelector('SegmentTimeline');
        const segments: DashSegment[] = [];

        if (segmentTimeline) {
            const sElements = segmentTimeline.querySelectorAll('S');
            let currentTime = 0;
            let currentNumber = startNumber;

            sElements.forEach((s: Element) => {
                // t is optional, defaults to previous end
                const tAttr = s.getAttribute('t');
                if (tAttr) currentTime = parseInt(tAttr, 10);

                const d: number = parseInt(s.getAttribute('d') || '0', 10);
                const r = parseInt(s.getAttribute('r') || '0', 10);

                // Initial segment
                segments.push({ number: currentNumber, time: currentTime });
                currentTime += d;
                currentNumber++;

                // Repeats
                // r is the number of REPEATS (so total occurrences = 1 + r)
                // If r is negative, it refers to open-ended? (Usually not in static manifests)
                for (let i = 0; i < r; i++) {
                    segments.push({ number: currentNumber, time: currentTime });
                    currentTime += d;
                    currentNumber++;
                }
            });
        }

        return {
            baseUrl,
            initialization,
            media,
            segments,
            repId,
            mimeType: audioSet.getAttribute('mimeType'),
        };
    }

    generateSegmentUrls(manifest: DashManifest): string[] {
        const { baseUrl, initialization, media, segments, repId } = manifest;
        const urls: string[] = [];

        // Helper to resolve template strings
        const resolveTemplate = (template: string, number: number, time: number): string => {
            return template
                .replace(/\$RepresentationID\$/g, repId ?? '')
                .replace(/\$Number(?:%0([0-9]+)d)?\$/g, (_match: string, width: string | undefined): string => {
                    if (width) {
                        return number.toString().padStart(parseInt(width), '0');
                    }
                    return number.toString();
                })
                .replace(/\$Time(?:%0([0-9]+)d)?\$/g, (_match: string, width: string | undefined): string => {
                    if (width) {
                        return time.toString().padStart(parseInt(width), '0');
                    }
                    return time.toString();
                });
        };

        // Helper to join paths handling slashes
        const joinPath = (base: string, part: string): string => {
            if (!base) return part;
            if (part.startsWith('http')) return part; // Absolute path
            return base.endsWith('/') ? base + part : base + '/' + part;
        };

        // 1. Initialization Segment
        if (initialization) {
            const initPath = resolveTemplate(initialization, 0, 0); // Init often doesn't use Number/Time but just in case
            urls.push(joinPath(baseUrl, initPath));
        }

        // 2. Media Segments
        if (segments && segments.length > 0) {
            segments.forEach((seg: DashSegment) => {
                const path: string = resolveTemplate(media!, seg.number, seg.time);
                urls.push(joinPath(baseUrl, path));
            });
        }

        return urls;
    }
}
