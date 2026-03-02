// js/desktop/neutralino-bridge.ts

interface NLBridgeMessage {
    type: string;
    eventName?: string;
    detail?: unknown;
    id?: string;
    result?: unknown;
    error?: unknown;
}

type EventHandler = (detail: unknown) => void;

const isNeutralino: boolean =
    typeof window !== 'undefined' &&
    (window.NL_MODE || window.location.search.includes('mode=neutralino') || window.parent !== window);

const listeners: Map<string, EventHandler[]> = new Map();

// Listen for events from the Shell (Parent)
if (isNeutralino) {
    window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data as NLBridgeMessage | undefined;
        if (data?.type === 'NL_EVENT') {
            const { eventName, detail } = data;
            if (eventName && listeners.has(eventName)) {
                listeners.get(eventName)!.forEach((handler: EventHandler) => {
                    try {
                        handler(detail);
                    } catch (e: unknown) {
                        console.error('[Bridge] Error in event handler:', e);
                    }
                });
            }
        }
    });
}

export const init = async (): Promise<void> => {
    if (!isNeutralino) return;
    // Notify Shell we are ready
    window.parent.postMessage({ type: 'NL_INIT' }, '*');
};

export const events = {
    on: (eventName: string, handler: EventHandler): void => {
        if (!isNeutralino) return;
        if (!listeners.has(eventName)) {
            listeners.set(eventName, []);
        }
        listeners.get(eventName)!.push(handler);
    },
    off: (eventName: string, handler: EventHandler): void => {
        if (!isNeutralino) return;
        if (!listeners.has(eventName)) return;
        const handlers: EventHandler[] = listeners.get(eventName)!;
        const index: number = handlers.indexOf(handler);
        if (index > -1) handlers.splice(index, 1);
    },
    broadcast: async (eventName: string, data?: unknown): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_BROADCAST', eventName, data }, '*');
    },
};

export const extensions = {
    dispatch: async (extensionId: string, eventName: string, data?: unknown): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_EXTENSION', extensionId, eventName, data }, '*');
    },
};

export const app = {
    exit: async (): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_APP_EXIT' }, '*');
    },
};

export const os = {
    open: async (url: string): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_OS_OPEN', url }, '*');
    },
    showSaveDialog: async (title: string, options?: Record<string, unknown>): Promise<unknown> => {
        if (!isNeutralino) return;
        return new Promise<unknown>((resolve) => {
            const id: string = Math.random().toString(36).substring(7);
            const handler = (event: MessageEvent): void => {
                const data = event.data as NLBridgeMessage | undefined;
                if (data?.type === 'NL_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            window.addEventListener('message', handler);
            window.parent.postMessage({ type: 'NL_OS_SHOW_SAVE_DIALOG', id, title, options }, '*');
        });
    },
    showFolderDialog: async (title: string, options?: Record<string, unknown>): Promise<unknown> => {
        if (!isNeutralino) return;
        return new Promise<unknown>((resolve) => {
            const id: string = Math.random().toString(36).substring(7);
            const handler = (event: MessageEvent): void => {
                const data = event.data as NLBridgeMessage | undefined;
                if (data?.type === 'NL_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handler);
                    resolve(data.result);
                }
            };
            window.addEventListener('message', handler);
            window.parent.postMessage({ type: 'NL_OS_SHOW_FOLDER_DIALOG', id, title, options }, '*');
        });
    },
};

export const filesystem = {
    readBinaryFile: async (path: string): Promise<unknown> => {
        if (!isNeutralino) return;
        return new Promise<unknown>((resolve, reject) => {
            const id: string = Math.random().toString(36).substring(7);
            const handler = (event: MessageEvent): void => {
                const data = event.data as NLBridgeMessage | undefined;
                if (data?.type === 'NL_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            window.addEventListener('message', handler);
            window.parent.postMessage({ type: 'NL_FS_READ_BINARY', id, path }, '*');
        });
    },
    readDirectory: async (path: string): Promise<unknown> => {
        if (!isNeutralino) return;
        return new Promise<unknown>((resolve, reject) => {
            const id: string = Math.random().toString(36).substring(7);
            const handler = (event: MessageEvent): void => {
                const data = event.data as NLBridgeMessage | undefined;
                if (data?.type === 'NL_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            window.addEventListener('message', handler);
            window.parent.postMessage({ type: 'NL_FS_READ_DIR', id, path }, '*');
        });
    },
    getStats: async (path: string): Promise<unknown> => {
        if (!isNeutralino) return;
        return new Promise<unknown>((resolve, reject) => {
            const id: string = Math.random().toString(36).substring(7);
            const handler = (event: MessageEvent): void => {
                const data = event.data as NLBridgeMessage | undefined;
                if (data?.type === 'NL_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            window.addEventListener('message', handler);
            window.parent.postMessage({ type: 'NL_FS_STATS', id, path }, '*');
        });
    },
    writeBinaryFile: async (path: string, buffer: ArrayBuffer): Promise<unknown> => {
        if (!isNeutralino) return;
        return new Promise<unknown>((resolve, reject) => {
            const id: string = Math.random().toString(36).substring(7);
            const handler = (event: MessageEvent): void => {
                const data = event.data as NLBridgeMessage | undefined;
                if (data?.type === 'NL_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            window.addEventListener('message', handler);
            window.parent.postMessage({ type: 'NL_FS_WRITE_BINARY', id, path, buffer }, '*', [buffer]);
        });
    },
    appendBinaryFile: async (path: string, buffer: ArrayBuffer): Promise<unknown> => {
        if (!isNeutralino) return;
        return new Promise<unknown>((resolve, reject) => {
            const id: string = Math.random().toString(36).substring(7);
            const handler = (event: MessageEvent): void => {
                const data = event.data as NLBridgeMessage | undefined;
                if (data?.type === 'NL_RESPONSE' && data.id === id) {
                    window.removeEventListener('message', handler);
                    if (data.error) reject(data.error);
                    else resolve(data.result);
                }
            };
            window.addEventListener('message', handler);
            // Transfer buffer if possible to save memory
            window.parent.postMessage({ type: 'NL_FS_APPEND_BINARY', id, path, buffer }, '*', [buffer]);
        });
    },
};

export const _window = {
    minimize: async (): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_WINDOW_MIN' }, '*');
    },
    maximize: async (): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_WINDOW_MAX' }, '*');
    },
    show: async (): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_WINDOW_SHOW' }, '*');
    },
    hide: async (): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_WINDOW_HIDE' }, '*');
    },
    isVisible: async (): Promise<boolean> => {
        return true; // Mock response
    },
    setTitle: async (title: string): Promise<void> => {
        if (!isNeutralino) return;
        window.parent.postMessage({ type: 'NL_WINDOW_SET_TITLE', title }, '*');
    },
};

// Expose generically for other modules
export { _window as window };
export default {
    init,
    events,
    extensions,
    app,
    os,
    filesystem,
    window: _window,
};
