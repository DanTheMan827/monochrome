// @ts-check
import { trackCloseSidePanel, trackCloseQueue, trackCloseLyrics } from './analytics.js';

/**
 * Manages the sliding side panel used to display the queue, lyrics, and other views.
 * Handles open/close lifecycle, content rendering, drag-to-resize, and analytics tracking.
 */
export class SidePanelManager {
    /**
     * Creates a new SidePanelManager and binds the resizer if the element exists.
     */
    constructor() {
        this.panel = document.getElementById('side-panel');
        this.titleElement = document.getElementById('side-panel-title');
        this.controlsElement = document.getElementById('side-panel-controls');
        this.contentElement = document.getElementById('side-panel-content');
        this.resizerElement = document.getElementById('side-panel-resizer');
        this.currentView = null; // 'queue' or 'lyrics'
        this.isResizing = false;

        if (this.resizerElement) {
            this.initResizer();
        }
    }

    emitChange() {
        window.dispatchEvent(
            new CustomEvent('side-panel-changed', {
                detail: {
                    active: this.panel.classList.contains('active'),
                    view: this.currentView,
                },
            })
        );
    }

    /**
     * Initialises the drag-to-resize handle and restores any previously saved width.
     * @returns {void}
     */
    initResizer() {
        this.resizerElement.addEventListener('mousedown', this.startResize.bind(this));

        // Restore saved width if available
        const savedWidth = localStorage.getItem('side-panel-width');
        if (savedWidth) {
            this.panel.style.setProperty('--side-panel-width', savedWidth + 'px');
        }
    }

    /**
     * Begins a resize drag operation on mousedown.
     * @param {MouseEvent} e - The mousedown event from the resizer handle
     * @returns {void}
     */
    startResize(e) {
        e.preventDefault();
        this.isResizing = true;
        this.panel.style.transition = 'none'; // Disable transition for smooth resizing
        document.body.style.cursor = 'ew-resize';

        this.resizeBind = this.resize.bind(this);
        this.stopResizeBind = this.stopResize.bind(this);

        document.addEventListener('mousemove', this.resizeBind);
        document.addEventListener('mouseup', this.stopResizeBind);
    }

    /**
     * Updates the panel width during a drag operation.
     * @param {MouseEvent} e - The mousemove event carrying the current cursor position
     * @returns {void}
     */
    resize(e) {
        if (!this.isResizing) return;
        // The panel is on the right side. Screen width - mouse X = desired width.
        const minWidth = 300;
        const maxWidth = window.innerWidth * 0.9;
        let newWidth = window.innerWidth - e.clientX;

        if (newWidth < minWidth) newWidth = minWidth;
        if (newWidth > maxWidth) newWidth = maxWidth;

        this.panel.style.setProperty('--side-panel-width', `${newWidth}px`);
    }

    /**
     * Ends the resize drag, restores CSS transitions, and persists the new width.
     * @returns {void}
     */
    stopResize() {
        this.isResizing = false;
        this.panel.style.transition = ''; // Restore transitions
        document.body.style.cursor = '';

        document.removeEventListener('mousemove', this.resizeBind);
        document.removeEventListener('mouseup', this.stopResizeBind);

        // Save the width
        const currentWidth = this.panel.style.getPropertyValue('--side-panel-width').replace('px', '');
        if (currentWidth) {
            localStorage.setItem('side-panel-width', currentWidth);
        }
    }

    /**
     * Opens the side panel for the given view, rendering title, controls, and content.
     * If the same view is already open and `forceOpen` is false, the panel is closed instead.
     * @param {string} view - Identifier for the view to display (e.g. `'queue'` or `'lyrics'`)
     * @param {string} title - Text shown in the panel's title bar
     * @param {((el: HTMLElement) => void) | null} renderControlsCallback - Called with the controls container; may be null
     * @param {((el: HTMLElement) => void) | null} renderContentCallback - Called with the content container; may be null
     * @param {boolean} [forceOpen=false] - When true, always opens even if already on the same view
     * @returns {void}
     */
    open(view, title, renderControlsCallback, renderContentCallback, forceOpen = false) {
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
        this.emitChange();
    }

    /**
     * Closes the side panel, fires analytics events, and clears content after the CSS transition.
     * @returns {void}
     */
    close() {
        // Track side panel close
        if (this.currentView) {
            if (this.currentView === 'lyrics') {
                // Get current track from audio player context
                const audioPlayer = /** @type {HTMLElement & { _currentTrack?: object }} */ (
                    document.getElementById('audio-player')
                );
                if (audioPlayer && audioPlayer._currentTrack) {
                    trackCloseLyrics(audioPlayer._currentTrack);
                }
            }
        }

        this.panel.classList.remove('active');
        this.currentView = null;
        this.emitChange();
        // Optionally clear content after transition
        setTimeout(() => {
            if (!this.panel.classList.contains('active')) {
                this.controlsElement.innerHTML = '';
                this.contentElement.innerHTML = '';
            }
        }, 300);
    }

    /**
     * Returns whether the given view is currently visible in the panel.
     * @param {string} view - View identifier to check
     * @returns {boolean} `true` if the panel is open and showing the requested view
     */
    isActive(view) {
        return this.currentView === view && this.panel.classList.contains('active');
    }

    /**
     * Re-renders the controls and/or content of an active panel view in-place.
     * Has no effect when the specified view is not currently shown.
     * @async
     * @param {string} view - View identifier; refresh only happens when this view is active
     * @param {((el: HTMLElement) => void | Promise<void>) | null} renderControlsCallback - Callback to re-render controls; may be null
     * @param {((el: HTMLElement) => void | Promise<void>) | null} renderContentCallback - Callback to re-render content; may be null
     * @param {{ noClear?: boolean }} [options={}] - Pass `{ noClear: true }` to skip clearing existing content before re-rendering
     * @returns {Promise<void>}
     */
    async refresh(view, renderControlsCallback, renderContentCallback, options = {}) {
        if (this.isActive(view)) {
            if (renderControlsCallback) {
                this.controlsElement.innerHTML = '';
                await renderControlsCallback(this.controlsElement);
            }
            if (renderContentCallback) {
                if (!options.noClear) {
                    this.contentElement.innerHTML = '';
                }
                await renderContentCallback(this.contentElement);
            }
        }
    }

    /**
     * Replaces the content area of an active panel view.
     * Has no effect when the specified view is not currently shown.
     * @async
     * @param {string} view - View identifier; update only happens when this view is active
     * @param {(el: HTMLElement) => void | Promise<void>} renderContentCallback - Callback that populates the cleared content container
     * @returns {Promise<void>}
     */
    async updateContent(view, renderContentCallback) {
        if (this.isActive(view)) {
            this.contentElement.innerHTML = '';
            await renderContentCallback(this.contentElement);
        }
    }
}

export const sidePanelManager = new SidePanelManager();
