// js/desktop/desktop.ts
import type { Player } from '../player.ts';
import Neutralino from './neutralino-bridge.ts';
import { initializeDiscordRPC } from './discord-rpc.ts';

export async function initDesktop(player: Player | null): Promise<void> {
    console.log('[Desktop] Initializing desktop features...');

    // Assign to window for modules that use global Neutralino (like Player.js)
    window.Neutralino = Neutralino as unknown as NonNullable<typeof window.Neutralino>;

    try {
        await Neutralino.init();
        console.log('[Desktop] Neutralino initialized.');

        if (player) {
            console.log('[Desktop] Starting Discord RPC...');
            initializeDiscordRPC(player);
        }
    } catch (error: unknown) {
        console.error('[Desktop] Failed to initialize desktop environment:', error);
    }
}
