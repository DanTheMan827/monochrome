import { loadEnv } from 'vite';
import type { Plugin, PreviewServer, UserConfig, ConfigEnv } from 'vite';
import cookieSession from 'cookie-session';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import type { IncomingMessage, ServerResponse } from 'http';

interface AuthSession {
    uid?: string;
    email?: unknown;
    iat?: number;
    [key: string]: unknown;
}

interface SessionRequest extends IncomingMessage {
    session?: AuthSession | null;
    originalUrl?: string;
}

interface AuthProviderOverrides {
    google?: boolean;
    password?: boolean;
}

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        let body: string = '';
        req.on('data', (chunk: Buffer | string) => (body += chunk));
        req.on('end', () => {
            try {
                resolve(JSON.parse(body) as Record<string, unknown>);
            } catch {
                reject(new Error('Invalid JSON'));
            }
        });
        req.on('error', reject);
    });
}

export default function authGatePlugin(): Plugin {
    let env: Record<string, string> = {};

    return {
        name: 'auth-gate',

        config(_: UserConfig, { mode }: ConfigEnv): void {
            env = loadEnv(mode, process.cwd(), '');
        },

        configurePreviewServer(server: PreviewServer): void {
            const AUTH_ENABLED: boolean = (env.AUTH_ENABLED ?? 'false') !== 'false';
            const FIREBASE_CONFIG: string | undefined = env.FIREBASE_CONFIG;
            const POCKETBASE_URL: string | undefined = env.POCKETBASE_URL;
            const AUTH_GOOGLE_ENABLED: string | undefined = env.AUTH_GOOGLE_ENABLED;
            const AUTH_EMAIL_ENABLED: string | undefined = env.AUTH_EMAIL_ENABLED;

            // Parse Firebase config once (used for injection + auth verification)
            let parsedFirebaseConfig: Record<string, string> | null = null;
            let PROJECT_ID: string = env.FIREBASE_PROJECT_ID || 'monochrome-database';
            if (FIREBASE_CONFIG) {
                try {
                    parsedFirebaseConfig = JSON.parse(FIREBASE_CONFIG) as Record<string, string>;
                    if (parsedFirebaseConfig.projectId) PROJECT_ID = parsedFirebaseConfig.projectId;
                } catch (e: unknown) {
                    const message: string = e instanceof Error ? e.message : String(e);
                    console.error('Invalid FIREBASE_CONFIG JSON:', message);
                    process.exit(1);
                }
            }

            // --- Build injection script (always, for both auth gate and env config) ---

            const flags: string[] = [];
            if (AUTH_ENABLED) flags.push('window.__AUTH_GATE__=true');
            const authProviderOverrides: AuthProviderOverrides = {};
            if (AUTH_GOOGLE_ENABLED !== undefined) {
                authProviderOverrides.google = AUTH_GOOGLE_ENABLED !== 'false';
            }
            if (AUTH_EMAIL_ENABLED !== undefined) {
                // Firebase calls it "password" provider; env uses "EMAIL" for clarity
                authProviderOverrides.password = AUTH_EMAIL_ENABLED !== 'false';
            }
            if (Object.keys(authProviderOverrides).length > 0) {
                flags.push(`window.__AUTH_PROVIDERS__=${JSON.stringify(authProviderOverrides)}`);
            }
            if (parsedFirebaseConfig) flags.push(`window.__FIREBASE_CONFIG__=${JSON.stringify(parsedFirebaseConfig)}`);
            if (POCKETBASE_URL) flags.push(`window.__POCKETBASE_URL__=${JSON.stringify(POCKETBASE_URL)}`);
            const configScript: string | null = flags.length > 0 ? `<script>${flags.join(';')};</script>` : null;

            // --- Pre-build injected HTML pages ---

            const distDir: string = join(process.cwd(), 'dist');

            let indexHtml: string | null = null;
            const indexPath: string = join(distDir, 'index.html');
            if (configScript && existsSync(indexPath)) {
                indexHtml = readFileSync(indexPath, 'utf-8');
                indexHtml = indexHtml.replace('</head>', `${configScript}\n</head>`);
            }

            let loginHtml: string | null = null;
            if (AUTH_ENABLED) {
                const loginPath: string = join(distDir, 'login.html');
                if (existsSync(loginPath)) {
                    loginHtml = readFileSync(loginPath, 'utf-8');
                    if (configScript) loginHtml = loginHtml.replace('</head>', `${configScript}\n</head>`);
                }
            }

            // --- /health (always available) ---

            server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
                if ((req.url ?? '').split('?')[0] === '/health') {
                    res.end('OK');
                    return;
                }
                next();
            });

            // --- Auth gate (only when enabled) ---

            if (AUTH_ENABLED) {
                const AUTH_SECRET: string | undefined = env.AUTH_SECRET;
                const SESSION_MAX_AGE: number = Number(env.SESSION_MAX_AGE) || 7 * 24 * 60 * 60 * 1000;

                if (!AUTH_SECRET) {
                    console.error('AUTH_SECRET is required when AUTH_ENABLED=true');
                    process.exit(1);
                }

                console.log(`Auth gate enabled (Firebase project: ${PROJECT_ID})`);

                const JWKS = createRemoteJWKSet(
                    new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
                );

                server.middlewares.use(
                    cookieSession({
                        name: 'mono_session',
                        keys: [AUTH_SECRET],
                        maxAge: SESSION_MAX_AGE,
                        httpOnly: true,
                        sameSite: 'lax',
                    }) as unknown as (req: IncomingMessage, res: ServerResponse, next: () => void) => void
                );

                server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
                    const sessionReq: SessionRequest = req as SessionRequest;
                    const url: string = (req.url ?? '').split('?')[0];

                    if (url === '/login' || url === '/login.html') {
                        if (sessionReq.session && sessionReq.session.uid) {
                            res.writeHead(302, { Location: '/' });
                            res.end();
                            return;
                        }
                        if (loginHtml) {
                            res.setHeader('Content-Type', 'text/html');
                            res.setHeader('Cache-Control', 'no-store');
                            res.end(loginHtml);
                        } else {
                            res.statusCode = 404;
                            res.end('Login page not found');
                        }
                        return;
                    }

                    if (url === '/api/auth/login' && req.method === 'POST') {
                        try {
                            const body: Record<string, unknown> = await parseBody(req);
                            if (!body.token) {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ error: 'Missing token' }));
                                return;
                            }
                            const { payload } = await jwtVerify(body.token as string, JWKS, {
                                issuer: `https://securetoken.google.com/${PROJECT_ID}`,
                                audience: PROJECT_ID,
                            });
                            sessionReq.session!.uid = payload.sub;
                            sessionReq.session!.email = payload.email;
                            sessionReq.session!.iat = Date.now();
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true }));
                        } catch (err: unknown) {
                            const message: string = err instanceof Error ? err.message : String(err);
                            console.error('Token verification failed:', message);
                            res.statusCode = 401;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ error: 'Invalid token' }));
                        }
                        return;
                    }

                    if (url === '/api/auth/logout' && req.method === 'POST') {
                        sessionReq.session = null;
                        res.setHeader('Clear-Site-Data', '"cache", "storage"');
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ ok: true }));
                        return;
                    }

                    if (!sessionReq.session || !sessionReq.session.uid) {
                        const ext: string = extname(url);
                        if (ext && ext !== '.html') {
                            res.statusCode = 401;
                            res.end('Unauthorized');
                        } else {
                            res.writeHead(302, { Location: '/login' });
                            res.end();
                        }
                        return;
                    }

                    // Authenticated: serve injected index.html for HTML routes
                    const ext: string = extname(url);
                    if ((!ext || ext === '.html') && indexHtml) {
                        res.setHeader('Content-Type', 'text/html');
                        res.setHeader('Cache-Control', 'no-store');
                        res.end(indexHtml);
                        return;
                    }

                    next();
                });
            } else if (indexHtml) {
                // No auth gate, but env config needs injection into HTML
                server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
                    const url: string = (req.url ?? '').split('?')[0];
                    const ext: string = extname(url);
                    if (!ext || ext === '.html') {
                        res.setHeader('Content-Type', 'text/html');
                        res.end(indexHtml);
                        return;
                    }
                    next();
                });
            }
        },
    };
}
