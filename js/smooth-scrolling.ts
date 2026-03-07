//js/smooth-scrolling.ts
import { smoothScrollingSettings } from './storage.ts';

interface LenisInstance {
    raf(time: number): void;
    destroy(): void;
}

let lenis: LenisInstance | null = null;
let lenisLoaded: boolean = false;
let lenisLoading: boolean = false;

async function loadLenisScript(): Promise<boolean> {
    if (lenisLoaded) return true;
    if (lenisLoading) {
        return new Promise<boolean>((resolve) => {
            const checkLoaded: ReturnType<typeof setInterval> = setInterval(() => {
                if (!lenisLoading) {
                    clearInterval(checkLoaded);
                    resolve(lenisLoaded);
                }
            }, 100);
        });
    }

    lenisLoading = true;

    try {
        await new Promise<Event>((resolve, reject) => {
            const script: HTMLScriptElement = document.createElement('script');
            script.src = 'https://unpkg.com/@studio-freight/lenis';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });

        lenisLoaded = true;
        lenisLoading = false;
        console.log('✓ Lenis loaded successfully');
        return true;
    } catch (error: unknown) {
        console.error('✗ Failed to load Lenis:', error);
        lenisLoaded = false;
        lenisLoading = false;
        return false;
    }
}

async function initializeSmoothScrolling(): Promise<void> {
    if (lenis) return; // Already initialized

    const loaded: boolean = await loadLenisScript();
    if (!loaded) return;

    if (!window.Lenis) return;

    lenis = new window.Lenis({
        wrapper: document.querySelector('.main-content'),
        content: document.querySelector('.main-content'),
        lerp: 0.1,
        smoothWheel: true,
        smoothTouch: false,
        normalizeWheel: true,
        wheelMultiplier: 0.8,
    });

    function raf(time: number): void {
        if (lenis) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
    }

    requestAnimationFrame(raf);
}

function destroySmoothScrolling(): void {
    if (lenis) {
        lenis.destroy();
        lenis = null;
    }
}

async function setupSmoothScrolling(): Promise<void> {
    // Check if smooth scrolling is enabled
    const smoothScrollingEnabled: boolean = smoothScrollingSettings.isEnabled();

    if (smoothScrollingEnabled) {
        await initializeSmoothScrolling();
    }

    // Listen for toggle changes
    window.addEventListener('smooth-scrolling-toggle', async function (e: Event): Promise<void> {
        const detail: { enabled: boolean } = (e as CustomEvent<{ enabled: boolean }>).detail;
        if (detail.enabled) {
            await initializeSmoothScrolling();
        } else {
            destroySmoothScrolling();
        }
    });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSmoothScrolling);
} else {
    setupSmoothScrolling();
}
