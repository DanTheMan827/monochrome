import { trackCloseSidePanel, trackCloseQueue, trackCloseLyrics } from './analytics.ts';

type SidePanelView = 'queue' | 'lyrics';
type RenderCallback = (container: HTMLElement) => void;

export class SidePanelManager {
    private panel: HTMLElement;
    private titleElement: HTMLElement;
    private controlsElement: HTMLElement;
    private contentElement: HTMLElement;
    private currentView: SidePanelView | null;

    constructor() {
        this.panel = document.getElementById('side-panel')!;
        this.titleElement = document.getElementById('side-panel-title')!;
        this.controlsElement = document.getElementById('side-panel-controls')!;
        this.contentElement = document.getElementById('side-panel-content')!;
        this.currentView = null;
    }

    open(view: SidePanelView, title: string, renderControlsCallback: RenderCallback | null, renderContentCallback: RenderCallback | null, forceOpen: boolean = false): void {
        // If clicking the same view that is already open, close it
        if (!forceOpen && this.currentView === view && this.panel.classList.contains('active')) {
            this.close();
            return;
        }

        this.currentView = view;
        this.panel.dataset.view = view;
        this.titleElement.textContent = title;

        // Clear previous content
        this.controlsElement.innerHTML = '';
        this.contentElement.innerHTML = '';

        // Render new content
        if (renderControlsCallback) renderControlsCallback(this.controlsElement);
        if (renderContentCallback) renderContentCallback(this.contentElement);

        this.panel.classList.add('active');
    }

    close(): void {
        // Track side panel close
        if (this.currentView) {
            trackCloseSidePanel();
            if (this.currentView === 'queue') {
                trackCloseQueue();
            } else if (this.currentView === 'lyrics') {
                // Get current track from audio player context
                const audioPlayer = document.getElementById('audio-player') as HTMLElement & { _currentTrack?: TrackData } | null;
                if (audioPlayer && audioPlayer._currentTrack) {
                    trackCloseLyrics(audioPlayer._currentTrack);
                }
            }
        }

        this.panel.classList.remove('active');
        this.currentView = null;
        // Optionally clear content after transition
        setTimeout(() => {
            if (!this.panel.classList.contains('active')) {
                this.controlsElement.innerHTML = '';
                this.contentElement.innerHTML = '';
            }
        }, 300);
    }

    isActive(view: SidePanelView): boolean {
        return this.currentView === view && this.panel.classList.contains('active');
    }

    refresh(view: SidePanelView, renderControlsCallback: RenderCallback | null, renderContentCallback: RenderCallback | null): void {
        if (this.isActive(view)) {
            if (renderControlsCallback) {
                this.controlsElement.innerHTML = '';
                renderControlsCallback(this.controlsElement);
            }
            if (renderContentCallback) {
                this.contentElement.innerHTML = '';
                renderContentCallback(this.contentElement);
            }
        }
    }

    updateContent(view: SidePanelView, renderContentCallback: RenderCallback): void {
        if (this.isActive(view)) {
            this.contentElement.innerHTML = '';
            renderContentCallback(this.contentElement);
        }
    }
}

export const sidePanelManager = new SidePanelManager();
