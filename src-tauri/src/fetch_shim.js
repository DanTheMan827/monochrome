(() => {
    const tauriInvoke =
        window.__TAURI_INTERNALS__?.invoke?.bind(window.__TAURI_INTERNALS__) ||
        window.__TAURI__?.core?.invoke?.bind(window.__TAURI__.core);

    if (!tauriInvoke) {
        console.error('[anonymous-fetch] Tauri invoke API unavailable');
        return;
    }

    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder();

    const forbiddenRequestHeaders = new Set(['origin', 'referer', 'referrer']);

    const bytesToBase64 = bytes => {
        let binary = '';
        const chunkSize = 0x8000;

        for (let index = 0; index < bytes.length; index += chunkSize) {
            const chunk = bytes.subarray(index, index + chunkSize);
            binary += String.fromCharCode(...chunk);
        }

        return btoa(binary);
    };

    const base64ToBytes = base64 => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes;
    };

    const headersToRecord = headers => {
        const record = {};

        headers.forEach((value, key) => {
            const normalized = key.toLowerCase();

            if (!forbiddenRequestHeaders.has(normalized)) {
                record[normalized] = value;
            }
        });

        return record;
    };

    const requestBodyToBase64 = async request => {
        if (request.method === 'GET' || request.method === 'HEAD') {
            return null;
        }

        const buffer = await request.clone().arrayBuffer();
        if (buffer.byteLength === 0) {
            return null;
        }

        return bytesToBase64(new Uint8Array(buffer));
    };

    class AnonymousFetchResponse {
        constructor(payload) {
            this.ok = payload.status >= 200 && payload.status < 300;
            this.status = payload.status;
            this.statusText = payload.statusText;
            this.url = payload.url;
            this.redirected = false;
            this.type = 'basic';
            this.bodyUsed = false;
            this.headers = new Headers(payload.headers || {});
            this._bytes = base64ToBytes(payload.bodyBase64 || '');
        }

        async body() {
            this.bodyUsed = true;
            return this._bytes.slice();
        }

        async arrayBuffer() {
            this.bodyUsed = true;
            return this._bytes.buffer.slice(
                this._bytes.byteOffset,
                this._bytes.byteOffset + this._bytes.byteLength,
            );
        }

        async text() {
            this.bodyUsed = true;
            return textDecoder.decode(this._bytes);
        }

        async json() {
            return JSON.parse(await this.text());
        }

        async blob() {
            this.bodyUsed = true;
            return new Blob([this._bytes]);
        }

        clone() {
            return new AnonymousFetchResponse({
                status: this.status,
                statusText: this.statusText,
                url: this.url,
                headers: Object.fromEntries(this.headers.entries()),
                bodyBase64: bytesToBase64(this._bytes),
            });
        }
    }

    const anonymousFetch = async (input, init = undefined) => {
        const request = new Request(input, init);
        const headers = headersToRecord(request.headers);
        const bodyBase64 = await requestBodyToBase64(request);

        const payload = await tauriInvoke('anonymous_fetch', {
            request: {
                url: request.url,
                method: request.method,
                headers,
                bodyBase64,
            },
        });

        return new AnonymousFetchResponse(payload);
    };

    window.fetch = anonymousFetch;
    window.__monochromeAnonymousFetchInstalled = true;

    if (!window.Headers) {
        window.Headers = class HeadersFallback {
            constructor(entries = {}) {
                this.entries = () => Object.entries(entries);
            }
        };
    }

    if (!window.TextEncoder) {
        window.TextEncoder = textEncoder.constructor;
    }
})();
