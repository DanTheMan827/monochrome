const API_URL = 'https://catbox.moe/user/api.php';
const R2_PUBLIC_URL = 'https://cucks.qzz.io';

const R2_ENDPOINT = 'https://faae2f5c0a232c7f3733ef597c55bd69.r2.cloudflarestorage.com';
const R2_BUCKET = 'monochrome-image-uploads';

async function hmac(key: ArrayBufferLike | ArrayBufferView, data: ArrayBufferLike | ArrayBufferView): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data as BufferSource));
}

async function sha256(data: ArrayBufferLike | ArrayBufferView): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', data as BufferSource));
}

function buf2hex(buffer: Uint8Array): string {
    return Array.from(buffer)
        .map((b: number) => b.toString(16).padStart(2, '0'))
        .join('');
}

async function signature(secretKey: string, dateStamp: string, region: string, service: string, stringToSign: string): Promise<string> {
    const kDate = await hmac(new TextEncoder().encode('AWS4' + secretKey), new TextEncoder().encode(dateStamp));
    const kRegion = await hmac(kDate, new TextEncoder().encode(region));
    const kService = await hmac(kRegion, new TextEncoder().encode(service));
    const kSigning = await hmac(kService, new TextEncoder().encode('aws4_request'));
    const sig = await hmac(kSigning, new TextEncoder().encode(stringToSign));
    return buf2hex(sig);
}

async function createSignature(method: string, path: string, headers: Record<string, string | number>, payloadHash: string, accessKeyId: string, secretAccessKey: string, amzDate: string, dateStamp: string): Promise<string> {
    const region = 'auto';
    const service = 's3';

    const signedHeaders = Object.keys(headers).sort().join(';');
    const canonicalHeaders =
        Object.entries(headers)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([k, v]) => `${k.toLowerCase()}:${v}`)
            .join('\n') + '\n';

    const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${buf2hex(await sha256(new TextEncoder().encode(canonicalRequest)))}`;

    const sig = await signature(secretAccessKey, dateStamp, region, service, stringToSign);
    return `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${sig}`;
}

interface UploadRequestBody {
    fileUrl?: string;
    fileName?: string;
}

export async function onRequest(context: CFContext): Promise<Response> {
    const { request, env } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
        return jsonError('Method not allowed', 405);
    }

    const useR2 = env.R2_ENABLED === 'true';

    try {
        const contentType = request.headers.get('content-type') || '';
        let file: ArrayBuffer;
        let fileName: string;
        let fileType: string;

        if (contentType.includes('application/json')) {
            const body = (await request.json()) as UploadRequestBody;
            if (!body.fileUrl) return jsonError('No fileUrl provided', 400);

            const res = await fetch(body.fileUrl);
            if (!res.ok) throw new Error('Failed to fetch remote file');

            file = await res.arrayBuffer();
            fileName = body.fileName || body.fileUrl.split('/').pop()!;
            fileType = res.headers.get('content-type') || 'application/octet-stream';
        } else {
            const form = await request.formData();
            const uploaded = form.get('file') as File | null;
            if (!uploaded) return jsonError('No file provided', 400);

            if (uploaded.size > 10 * 1024 * 1024) {
                return jsonError('File exceeds 10MB', 400);
            }

            file = await uploaded.arrayBuffer();
            fileName = uploaded.name;
            fileType = uploaded.type || 'application/octet-stream';
        }

        let url;

        if (useR2) {
            try {
                const key = `${Date.now()}-${fileName}`;
                const now = new Date();
                const amzDate =
                    now
                        .toISOString()
                        .replace(/[:-]|\.\d{3}/g, '')
                        .slice(0, 15) + 'Z';
                const dateStamp = now
                    .toISOString()
                    .replace(/[:-]|\.\d{3}/g, '')
                    .slice(0, 8);
                const payloadHash = buf2hex(await sha256(file));

                const host = new URL(R2_ENDPOINT).host;
                const headers: Record<string, string | number> = {
                    'Content-Type': fileType,
                    'Content-Length': file.byteLength,
                    'x-amz-date': amzDate,
                    'x-amz-content-sha256': payloadHash,
                    Host: host,
                };

                const authHeader = await createSignature(
                    'PUT',
                    `/${R2_BUCKET}/${key}`,
                    headers,
                    payloadHash,
                    env.R2_ACCESS_KEY_ID!,
                    env.R2_SECRET_ACCESS_KEY!,
                    amzDate,
                    dateStamp
                );
                headers['Authorization'] = authHeader;

                const res = await fetch(`${R2_ENDPOINT}/${R2_BUCKET}/${key}`, {
                    method: 'PUT',
                    headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k, String(v)])) as Record<string, string>,
                    body: new Uint8Array(file),
                });

                if (!res.ok) {
                    const err = await res.text();
                    throw new Error(`R2 error: ${res.status} - ${err}`);
                }

                url = `${R2_PUBLIC_URL}/${key}`;
            } catch (r2Err) {
                console.error('R2 upload error:', r2Err);
                return jsonError(`R2 upload failed: ${(r2Err as Error).message}`, 500);
            }
        } else {
            const formData = new FormData();
            formData.append('reqtype', 'fileupload');
            formData.append('fileToUpload', new Blob([file], { type: fileType }), fileName);

            const response = await fetch(API_URL, {
                method: 'POST',
                body: formData,
            });

            const responseText = await response.text();

            if (!response.ok) {
                throw new Error(`Upload failed: ${responseText}`);
            }

            url = responseText.trim();
        }

        return jsonResponse({
            success: true,
            url: url,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonError(message, 500);
    }
}

function jsonResponse(obj: Record<string, unknown>, status: number = 200): Response {
    return new Response(JSON.stringify(obj), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
        },
    });
}

function jsonError(message: string, status: number): Response {
    return jsonResponse({ success: false, error: message }, status);
}

function corsHeaders(): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
    };
}

