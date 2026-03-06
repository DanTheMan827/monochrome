const API_URL = 'https://catbox.moe/user/api.php';

interface UploadRequestBody {
    fileUrl?: string;
    fileName?: string;
}

export async function onRequest(context: CFContext): Promise<Response> {
    const { request } = context;

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
        return jsonError('Method not allowed', 405);
    }

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

            if (uploaded.size > 100 * 1024 * 1024) {
                return jsonError('File exceeds 100MB', 400);
            }

            file = await uploaded.arrayBuffer();
            fileName = uploaded.name;
            fileType = uploaded.type || 'application/octet-stream';
        }

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

        const url = responseText.trim();

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
