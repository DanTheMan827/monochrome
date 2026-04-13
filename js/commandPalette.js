// @ts-check
import { debounce } from './utils.js';
import { db } from './db.js';
import Fuse from 'fuse.js';
import { navigate } from './router.js';
import {
    SVG_SEARCH,
    SVG_HOUSE,
    SVG_LIBRARY,
    SVG_CLOCK,
    SVG_CALENDAR,
    SVG_SETTINGS,
    SVG_INFO,
    SVG_DOWNLOAD,
    SVG_HAND_HEART,
    SVG_PLAY,
    SVG_SKIP_FORWARD,
    SVG_SKIP_BACK,
    SVG_SHUFFLE,
    SVG_REPEAT,
    SVG_MUTE,
    SVG_VOLUME_1,
    SVG_HEART,
    SVG_LIST,
    SVG_TRASH,
    SVG_ALIGN_LEFT,
    SVG_MAXIMIZE,
    SVG_SPARKLES,
    SVG_MONITOR,
    SVG_MOON,
    SVG_SUN,
    SVG_PALETTE,
    SVG_STORE,
    SVG_SLIDERS,
    SVG_PLUS,
    SVG_FOLDER_PLUS,
    SVG_KEYBOARD,
    SVG_UPLOAD,
    SVG_USER,
    SVG_PENCIL,
    SVG_LOG_OUT,
    SVG_LOG_IN,
    SVG_MUSIC,
    SVG_DISC,
    SVG_MIC,
    SVG_RADIO,
} from './icons.js';
import { Player } from './player.js';
import { UIRenderer } from './ui.js';

const ICON_SIZE = 16;

const ICONS = {
    search: SVG_SEARCH,
    house: SVG_HOUSE,
    library: SVG_LIBRARY,
    clock: SVG_CLOCK,
    calendar: SVG_CALENDAR,
    settings: SVG_SETTINGS,
    info: SVG_INFO,
    download: SVG_DOWNLOAD,
    handHeart: SVG_HAND_HEART,
    play: SVG_PLAY,
    skipForward: SVG_SKIP_FORWARD,
    skipBack: SVG_SKIP_BACK,
    shuffle: SVG_SHUFFLE,
    repeat: SVG_REPEAT,
    volumeX: SVG_MUTE,
    volume: SVG_VOLUME_1,
    heart: SVG_HEART,
    list: SVG_LIST,
    trash: SVG_TRASH,
    text: SVG_ALIGN_LEFT,
    maximize: SVG_MAXIMIZE,
    sparkles: SVG_SPARKLES,
    monitor: SVG_MONITOR,
    moon: SVG_MOON,
    sun: SVG_SUN,
    palette: SVG_PALETTE,
    store: SVG_STORE,
    sliders: SVG_SLIDERS,
    plus: SVG_PLUS,
    folderPlus: SVG_FOLDER_PLUS,
    keyboard: SVG_KEYBOARD,
    upload: SVG_UPLOAD,
    user: SVG_USER,
    pencil: SVG_PENCIL,
    logOut: SVG_LOG_OUT,
    logIn: SVG_LOG_IN,
    music: SVG_MUSIC,
    disc: SVG_DISC,
    mic: SVG_MIC,
    radio: SVG_RADIO,
};

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param {string} str - The raw string to escape.
 * @returns {string} The HTML-escaped string.
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Command palette UI controller that provides quick-access search for
 * navigation commands, playback controls, settings, and music search.
 */
class CommandPalette {
    /**
     * Initialises the CommandPalette, wires up DOM references, builds the
     * command list, creates the Fuse fuzzy-search index, and attaches event
     * listeners.
     */
    constructor() {
        this.overlay = document.getElementById('command-palette-overlay');
        this.input = /** @type {HTMLInputElement} */ (document.getElementById('command-palette-input'));
        this.resultsContainer = document.getElementById('command-palette-results');
        this.isOpen = false;
        this.selectedIndex = 0;
        this.flatItems = [];
        this.allSettings = [];
        this.musicSearchAbort = null;
        this.debouncedMusicSearch = debounce(this.searchMusic.bind(this), 300);
        this.commands = this.buildCommands();
        this.fuse = new Fuse(this.commands, {
            keys: [
                { name: 'label', weight: 0.6 },
                { name: 'keywords', weight: 0.3 },
                { name: 'group', weight: 0.1 },
            ],
            threshold: 0.4,
            ignoreLocation: true,
            includeScore: true,
        });

        this.init();
    }

    /**
     * Builds and returns the static list of palette commands covering
     * navigation, playback, queue, view, theme, audio, library, system, and
     * account actions.
     * @returns {Array<Object>} Array of command descriptor objects.
     */
    buildCommands() {
        return [
            {
                id: 'nav-home',
                group: 'Navigation',
                icon: 'house',
                label: 'Go to Home',
                keywords: ['home', 'main', 'start', 'landing'],
                action: () => {
                    navigate('/');
                },
            },
            {
                id: 'nav-library',
                group: 'Navigation',
                icon: 'library',
                label: 'Go to Library',
                keywords: ['library', 'collection', 'playlists', 'favorites'],
                action: () => {
                    navigate('/library');
                },
            },
            {
                id: 'nav-recent',
                group: 'Navigation',
                icon: 'clock',
                label: 'Go to Recent',
                keywords: ['recent', 'history', 'last played'],
                action: () => {
                    navigate('/recent');
                },
            },
            {
                id: 'nav-unreleased',
                group: 'Navigation',
                icon: 'calendar',
                label: 'Go to Unreleased',
                keywords: ['unreleased', 'upcoming', 'tracker'],
                action: () => {
                    navigate('/unreleased');
                },
            },
            {
                id: 'nav-settings',
                group: 'Navigation',
                icon: 'settings',
                label: 'Go to Settings',
                keywords: ['settings', 'preferences', 'config', 'options'],
                shortcut: null,
                action: () => {
                    navigate('/settings');
                },
            },
            {
                id: 'nav-about',
                group: 'Navigation',
                icon: 'info',
                label: 'Go to About',
                keywords: ['about', 'version', 'credits'],
                action: () => {
                    navigate('/about');
                },
            },
            {
                id: 'nav-download',
                group: 'Navigation',
                icon: 'download',
                label: 'Go to Download',
                keywords: ['download', 'desktop', 'app'],
                action: () => {
                    navigate('/download');
                },
            },
            {
                id: 'nav-donate',
                group: 'Navigation',
                icon: 'handHeart',
                label: 'Go to Donate',
                keywords: ['donate', 'support', 'contribute'],
                action: () => {
                    navigate('/donate');
                },
            },

            {
                id: 'play-pause',
                group: 'Playback',
                icon: 'play',
                label: 'Play / Pause',
                keywords: ['play', 'pause', 'toggle', 'resume', 'stop'],
                shortcut: 'Space',
                action: () => {
                    void Player.instance.handlePlayPause();
                },
            },
            {
                id: 'play-next',
                group: 'Playback',
                icon: 'skipForward',
                label: 'Next Track',
                keywords: ['next', 'skip', 'forward'],
                shortcut: 'Shift+\u2192',
                action: () => {
                    void Player.instance.playNext();
                },
            },
            {
                id: 'play-prev',
                group: 'Playback',
                icon: 'skipBack',
                label: 'Previous Track',
                keywords: ['previous', 'back', 'rewind'],
                shortcut: 'Shift+\u2190',
                action: () => {
                    Player.instance.playPrev();
                },
            },
            {
                id: 'play-shuffle',
                group: 'Playback',
                icon: 'shuffle',
                label: 'Toggle Shuffle',
                keywords: ['shuffle', 'random'],
                shortcut: 'S',
                action: () => {
                    document.getElementById('shuffle-btn')?.click();
                },
            },
            {
                id: 'play-repeat',
                group: 'Playback',
                icon: 'repeat',
                label: 'Toggle Repeat',
                keywords: ['repeat', 'loop', 'cycle'],
                shortcut: 'R',
                action: () => {
                    document.getElementById('repeat-btn')?.click();
                },
            },
            {
                id: 'play-mute',
                group: 'Playback',
                icon: 'volumeX',
                label: 'Mute / Unmute',
                keywords: ['mute', 'unmute', 'sound', 'volume', 'silent'],
                shortcut: 'M',
                action: () => {
                    const el = Player.instance.activeElement;
                    if (el) el.muted = !el.muted;
                },
            },
            {
                id: 'play-vol-up',
                group: 'Playback',
                icon: 'volume',
                label: 'Volume Up',
                keywords: ['volume', 'louder'],
                shortcut: '\u2191',
                action: () => {
                    const p = Player.instance;
                    if (p) p.setVolume(p.userVolume + 0.1);
                },
            },
            {
                id: 'play-vol-down',
                group: 'Playback',
                icon: 'volume',
                label: 'Volume Down',
                keywords: ['volume', 'quieter', 'softer'],
                shortcut: '\u2193',
                action: () => {
                    const p = Player.instance;
                    if (p) p.setVolume(p.userVolume - 0.1);
                },
            },

            {
                id: 'like-current',
                group: 'Now Playing',
                icon: 'heart',
                label: 'Like Current Track',
                keywords: ['like', 'favorite', 'love', 'heart', 'save'],
                action: () => {
                    /** @type {HTMLElement | null} */ (document.querySelector('.now-playing-bar .like-btn'))?.click();
                },
            },
            {
                id: 'download-current',
                group: 'Now Playing',
                icon: 'download',
                label: 'Download Current Track',
                keywords: ['download', 'save', 'current'],
                action: () => {
                    /** @type {HTMLElement | null} */ (
                        document.querySelector('.now-playing-bar .download-btn')
                    )?.click();
                },
            },

            {
                id: 'queue-open',
                group: 'Queue',
                icon: 'list',
                label: 'Open Queue',
                keywords: ['queue', 'list', 'up next'],
                shortcut: 'Q',
                action: () => {
                    document.getElementById('queue-btn')?.click();
                },
            },
            {
                id: 'queue-wipe',
                group: 'Queue',
                icon: 'trash',
                label: 'Clear Queue',
                keywords: ['wipe', 'clear', 'empty', 'queue'],
                action: async () => {
                    void Player.instance.wipeQueue();
                    await this.notify('Queue cleared');
                },
            },
            {
                id: 'queue-like-all',
                group: 'Queue',
                icon: 'heart',
                label: 'Like All in Queue',
                keywords: ['like', 'all', 'queue', 'heart', 'favorite'],
                action: () => this.likeAllInQueue(),
            },
            {
                id: 'queue-download',
                group: 'Queue',
                icon: 'download',
                label: 'Download Queue',
                keywords: ['download', 'queue', 'save', 'all'],
                action: () => this.downloadQueue(),
            },

            {
                id: 'lyrics-toggle',
                group: 'View',
                icon: 'text',
                label: 'Toggle Lyrics',
                keywords: ['lyrics', 'words', 'text', 'karaoke'],
                shortcut: 'L',
                action: () => {
                    /** @type {HTMLElement | null} */ (document.querySelector('.now-playing-bar .cover'))?.click();
                },
            },
            {
                id: 'fullscreen-open',
                group: 'View',
                icon: 'maximize',
                label: 'Open Fullscreen View',
                keywords: ['fullscreen', 'expand', 'immersive', 'cover'],
                action: () => {
                    const cover = /** @type {HTMLElement | null} */ (
                        document.querySelector('.now-playing-bar .cover-art')
                    );
                    if (cover) cover.click();
                },
            },
            {
                id: 'vis-toggle',
                group: 'View',
                icon: 'sparkles',
                label: 'Toggle Visualizer',
                keywords: ['visualizer', 'visual', 'animation', 'effects'],
                action: () => this.toggleVisualizer(),
            },
            {
                id: 'vis-butterchurn',
                group: 'View',
                icon: 'sparkles',
                label: 'Visualizer: Butterchurn',
                keywords: ['butterchurn', 'milkdrop', 'preset', 'visualizer'],
                action: () => this.setVisualizerPreset('butterchurn'),
            },
            {
                id: 'vis-kawarp',
                group: 'View',
                icon: 'sparkles',
                label: 'Visualizer: Kawarp',
                keywords: ['kawarp', 'preset', 'visualizer'],
                action: () => this.setVisualizerPreset('kawarp'),
            },
            {
                id: 'vis-lcd',
                group: 'View',
                icon: 'sparkles',
                label: 'Visualizer: LCD',
                keywords: ['lcd', 'preset', 'visualizer'],
                action: () => this.setVisualizerPreset('lcd'),
            },
            {
                id: 'vis-particles',
                group: 'View',
                icon: 'sparkles',
                label: 'Visualizer: Particles',
                keywords: ['particles', 'preset', 'visualizer'],
                action: () => this.setVisualizerPreset('particles'),
            },
            {
                id: 'vis-unknown',
                group: 'View',
                icon: 'sparkles',
                label: 'Visualizer: Unknown Pleasures',
                keywords: ['unknown pleasures', 'preset', 'visualizer', 'joy division'],
                action: () => this.setVisualizerPreset('unknown-pleasures'),
            },

            {
                id: 'theme-system',
                group: 'Theme',
                icon: 'monitor',
                label: 'Theme: System',
                keywords: ['theme', 'system', 'auto', 'default'],
                action: () => this.setTheme('system'),
            },
            {
                id: 'theme-black',
                group: 'Theme',
                icon: 'moon',
                label: 'Theme: Monochrome',
                keywords: ['theme', 'monochrome', 'black', 'dark', 'amoled'],
                action: () => this.setTheme('monochrome'),
            },
            {
                id: 'theme-dark',
                group: 'Theme',
                icon: 'moon',
                label: 'Theme: Dark',
                keywords: ['theme', 'dark'],
                action: () => this.setTheme('dark'),
            },
            {
                id: 'theme-white',
                group: 'Theme',
                icon: 'sun',
                label: 'Theme: White',
                keywords: ['theme', 'white', 'light'],
                action: () => this.setTheme('white'),
            },
            {
                id: 'theme-ocean',
                group: 'Theme',
                icon: 'palette',
                label: 'Theme: Ocean',
                keywords: ['theme', 'ocean', 'blue', 'sea'],
                action: () => this.setTheme('ocean'),
            },
            {
                id: 'theme-purple',
                group: 'Theme',
                icon: 'palette',
                label: 'Theme: Purple',
                keywords: ['theme', 'purple', 'violet'],
                action: () => this.setTheme('purple'),
            },
            {
                id: 'theme-forest',
                group: 'Theme',
                icon: 'palette',
                label: 'Theme: Forest',
                keywords: ['theme', 'forest', 'green', 'nature'],
                action: () => this.setTheme('forest'),
            },
            {
                id: 'theme-mocha',
                group: 'Theme',
                icon: 'palette',
                label: 'Theme: Mocha',
                keywords: ['theme', 'mocha', 'catppuccin', 'brown', 'warm'],
                action: () => this.setTheme('mocha'),
            },
            {
                id: 'theme-macchiato',
                group: 'Theme',
                icon: 'palette',
                label: 'Theme: Macchiato',
                keywords: ['theme', 'macchiato', 'catppuccin'],
                action: () => this.setTheme('machiatto'),
            },
            {
                id: 'theme-frappe',
                group: 'Theme',
                icon: 'palette',
                label: 'Theme: Frapp\u00e9',
                keywords: ['theme', 'frappe', 'catppuccin'],
                action: () => this.setTheme('frappe'),
            },
            {
                id: 'theme-latte',
                group: 'Theme',
                icon: 'palette',
                label: 'Theme: Latte',
                keywords: ['theme', 'latte', 'catppuccin', 'light'],
                action: () => this.setTheme('latte'),
            },
            {
                id: 'theme-store',
                group: 'Theme',
                icon: 'store',
                label: 'Open Theme Store',
                keywords: ['theme', 'store', 'browse', 'community', 'custom'],
                action: () => {
                    document.getElementById('open-theme-store')?.click();
                },
            },

            {
                id: 'quality-auto',
                group: 'Audio',
                icon: 'sliders',
                label: 'Quality: Auto (Adaptive)',
                keywords: ['quality', 'auto', 'adaptive', 'streaming', 'bitrate'],
                action: () => this.setQuality('auto'),
            },
            {
                id: 'quality-low',
                group: 'Audio',
                icon: 'sliders',
                label: 'Quality: Low',
                keywords: ['quality', 'low', 'streaming', 'bitrate'],
                action: () => this.setQuality('LOW'),
            },
            {
                id: 'quality-high',
                group: 'Audio',
                icon: 'sliders',
                label: 'Quality: High',
                keywords: ['quality', 'high', 'streaming', 'bitrate'],
                action: () => this.setQuality('HIGH'),
            },
            {
                id: 'quality-lossless',
                group: 'Audio',
                icon: 'sliders',
                label: 'Quality: Lossless',
                keywords: ['quality', 'lossless', 'flac', 'cd', 'streaming'],
                action: () => this.setQuality('LOSSLESS'),
            },
            {
                id: 'quality-hires',
                group: 'Audio',
                icon: 'sliders',
                label: 'Quality: Hi-Res',
                keywords: ['quality', 'hires', 'hi-res', 'master', 'mqa', 'streaming'],
                action: () => this.setQuality('HI_RES_LOSSLESS'),
            },
            {
                id: 'sleep-15',
                group: 'Audio',
                icon: 'clock',
                label: 'Sleep Timer: 15 min',
                keywords: ['sleep', 'timer', '15', 'minutes'],
                action: () => this.setSleepTimer(15),
            },
            {
                id: 'sleep-30',
                group: 'Audio',
                icon: 'clock',
                label: 'Sleep Timer: 30 min',
                keywords: ['sleep', 'timer', '30', 'minutes'],
                action: () => this.setSleepTimer(30),
            },
            {
                id: 'sleep-60',
                group: 'Audio',
                icon: 'clock',
                label: 'Sleep Timer: 60 min',
                keywords: ['sleep', 'timer', '60', 'minutes', 'hour'],
                action: () => this.setSleepTimer(60),
            },
            {
                id: 'sleep-120',
                group: 'Audio',
                icon: 'clock',
                label: 'Sleep Timer: 120 min',
                keywords: ['sleep', 'timer', '120', 'minutes', 'hours'],
                action: () => this.setSleepTimer(120),
            },

            {
                id: 'lib-create-playlist',
                group: 'Library',
                icon: 'plus',
                label: 'Create Playlist',
                keywords: ['create', 'new', 'playlist', 'add'],
                action: () => this.createPlaylist(),
            },
            {
                id: 'lib-create-folder',
                group: 'Library',
                icon: 'folderPlus',
                label: 'Create Folder',
                keywords: ['create', 'new', 'folder', 'add', 'organize'],
                action: () => this.createFolder(),
            },

            {
                id: 'sys-cache',
                group: 'System',
                icon: 'trash',
                label: 'Clear Cache',
                keywords: ['cache', 'clear', 'reset', 'clean'],
                action: () => this.clearCache(),
            },
            {
                id: 'sys-shortcuts',
                group: 'System',
                icon: 'keyboard',
                label: 'View Keyboard Shortcuts',
                keywords: ['keyboard', 'shortcuts', 'keys', 'hotkeys', 'bindings'],
                action: () => {
                    document.getElementById('shortcuts-modal')?.style.setProperty('display', 'flex');
                },
            },
            {
                id: 'sys-export',
                group: 'System',
                icon: 'upload',
                label: 'Export Data',
                keywords: ['export', 'backup', 'data', 'save'],
                action: () => this.navigateToSetting({ tab: 'system', id: 'export-data-btn' }),
            },
            {
                id: 'sys-search-setting',
                group: 'System',
                icon: 'search',
                label: 'Search Settings...',
                keywords: ['setting', 'find', 'search', 'preference', 'option', 'configure'],
                keepOpen: true,
                action: () => this.enterSettingsMode(),
            },

            {
                id: 'acc-profile',
                group: 'Account',
                icon: 'user',
                label: 'View Profile',
                keywords: ['profile', 'account', 'user', 'me'],
                action: () => {
                    /** @type {HTMLElement | null} */ (document.querySelector('.user-avatar-btn'))?.click();
                },
            },
            {
                id: 'acc-edit-profile',
                group: 'Account',
                icon: 'pencil',
                label: 'Edit Profile',
                keywords: ['edit', 'profile', 'username', 'avatar', 'display name'],
                action: async () => {
                    const { openEditProfile } = await import('./profile.js');
                    await openEditProfile();
                },
            },
            {
                id: 'acc-sign-out',
                group: 'Account',
                icon: 'logOut',
                label: 'Sign Out',
                keywords: ['sign out', 'log out', 'logout', 'disconnect'],
                action: async () => {
                    const { authManager } = await import('./accounts/auth.js');
                    await authManager.signOut();
                },
            },
            {
                id: 'acc-sign-in',
                group: 'Account',
                icon: 'logIn',
                label: 'Sign In',
                keywords: ['sign in', 'log in', 'login', 'account', 'connect'],
                action: () => {
                    navigate('/account');
                },
            },
        ];
    }

    /**
     * Registers global keyboard listeners (Ctrl/Cmd+K), input event handlers,
     * overlay click-to-close behaviour, and pre-caches all settings items.
     */
    init() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });

        this.input.addEventListener('input', () => this.handleInput());
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });

        this.cacheAllSettings();
    }

    /**
     * Toggles the command palette open or closed.
     */
    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    /**
     * Opens the command palette, resets state, focuses the input, and shows
     * the default command set.
     */
    open() {
        this.isOpen = true;
        this.settingsMode = false;
        this.overlay.style.display = 'flex';
        this.input.value = '';
        this.input.placeholder = 'Search commands, music, settings...';
        this.input.focus();
        this.showDefaultCommands();
    }

    /**
     * Closes the command palette and cancels any in-flight music search.
     */
    close() {
        this.isOpen = false;
        this.settingsMode = false;
        this.overlay.style.display = 'none';
        this.cancelMusicSearch();
    }

    /**
     * Switches the palette into settings-search mode, updating the placeholder
     * and rendering filtered settings results.
     */
    enterSettingsMode() {
        this.settingsMode = true;
        this.input.value = '';
        this.input.placeholder = 'Search settings...';
        this.input.focus();
        this.cacheAllSettings();
        this.renderSettingsResults('');
    }

    /**
     * Handles text input changes, routing to settings search, default commands,
     * fuzzy command search, or debounced music search as appropriate.
     */
    handleInput() {
        const query = this.input.value.trim();
        this.selectedIndex = 0;

        if (this.settingsMode) {
            this.renderSettingsResults(query);
            return;
        }

        if (!query) {
            this.cancelMusicSearch();
            this.showDefaultCommands();
            return;
        }

        this.searchCommands(query);
        this.debouncedMusicSearch(query);
    }

    /**
     * Handles keyboard navigation (ArrowUp/Down, Enter, Escape, Backspace)
     * within the command palette input.
     * @param {KeyboardEvent} e - The keyboard event fired on the input element.
     */
    handleKeydown(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.flatItems.length - 1);
            this.updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.updateSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            this.executeSelected().catch(console.error);
        } else if (e.key === 'Escape') {
            if (this.settingsMode) {
                this.settingsMode = false;
                this.input.value = '';
                this.input.placeholder = 'Search commands, music, settings...';
                this.showDefaultCommands();
            } else {
                this.close();
            }
        } else if (e.key === 'Backspace' && this.settingsMode && !this.input.value) {
            this.settingsMode = false;
            this.input.placeholder = 'Search commands, music, settings...';
            this.showDefaultCommands();
        }
    }

    /**
     * Renders the priority subset of commands shown when the input is empty.
     */
    showDefaultCommands() {
        const groups = this.groupBy(
            this.commands.filter((c) => {
                const priority = [
                    'nav-home',
                    'nav-library',
                    'nav-settings',
                    'play-pause',
                    'play-next',
                    'play-prev',
                    'play-shuffle',
                    'queue-open',
                    'lyrics-toggle',
                    'fullscreen-open',
                    'sys-search-setting',
                ];
                return priority.includes(c.id);
            }),
            'group'
        );

        this.renderGroups(groups);
    }

    /**
     * Performs a fuzzy search over the static command list and renders the
     * matching results grouped by category.
     * @param {string} query - The search query string.
     */
    searchCommands(query) {
        const fuseResults = this.fuse.search(query).slice(0, 12);
        const matched = fuseResults.map((r) => r.item);

        if (matched.length === 0) {
            this.renderGroups({});
            return;
        }

        const groups = this.groupBy(matched, 'group');
        this.renderGroups(groups);
    }

    /**
     * Searches the music API for tracks, albums, and artists matching the
     * query, then appends the results to the palette.
     * @async
     * @param {string} query - The search query string.
     */
    async searchMusic(query) {
        if (!query || query.length < 2) return;

        const api = UIRenderer.instance.api;
        if (!api) return;

        this.cancelMusicSearch();
        const controller = new AbortController();
        this.musicSearchAbort = controller;

        this.showMusicLoading();

        try {
            const results = await api.search(query, { limit: 4 });
            const tracks = results.tracks || { items: [] };
            const albums = results.albums || { items: [] };
            const artists = results.artists || { items: [] };

            if (controller.signal.aborted || !this.isOpen) return;

            const musicGroups = /** @type {Record<string, any[]>} */ ({});

            if (tracks?.items?.length) {
                musicGroups['Tracks'] = tracks.items.map((track) => ({
                    id: `track-${track.id}`,
                    group: 'Tracks',
                    icon: 'music',
                    image: api.getCoverUrl(track.album?.cover, 80),
                    label: track.title,
                    description: `${track.artist?.name || 'Unknown'} \u2022 ${track.album?.title || ''}`,
                    action: async () => {
                        void Player.instance.setQueue([track], 0);
                        await Player.instance.playTrackFromQueue();
                    },
                }));
            }

            if (albums?.items?.length) {
                musicGroups['Albums'] = albums.items.map((album) => ({
                    id: `album-${album.id}`,
                    group: 'Albums',
                    icon: 'disc',
                    image: api.getCoverUrl(album.cover, 80),
                    label: album.title,
                    description: album.artist?.name || 'Unknown',
                    action: () => {
                        navigate(`/album/${album.id}`);
                    },
                }));
            }

            if (artists?.items?.length) {
                musicGroups['Artists'] = artists.items.map((artist) => ({
                    id: `artist-${artist.id}`,
                    group: 'Artists',
                    icon: 'mic',
                    image: api.getArtistPictureUrl(artist.picture, 80),
                    label: artist.name,
                    description: 'Artist',
                    action: () => {
                        navigate(`/artist/${artist.id}`);
                    },
                }));
            }

            if (Object.keys(musicGroups).length > 0) {
                this.appendMusicGroups(musicGroups);
            }

            this.removeMusicLoading();
        } catch (e) {
            if (e.name !== 'AbortError') {
                this.removeMusicLoading();
            }
        }
    }

    /**
     * Aborts any in-flight music search request and clears the stored
     * AbortController reference.
     */
    cancelMusicSearch() {
        if (this.musicSearchAbort) {
            this.musicSearchAbort.abort();
            this.musicSearchAbort = null;
        }
    }

    /**
     * Appends a loading spinner element to the results container while a music
     * search is in progress.
     */
    showMusicLoading() {
        this.removeMusicLoading();
        const loading = document.createElement('div');
        loading.className = 'cmdk-loading';
        loading.setAttribute('data-music-loading', '');
        loading.innerHTML = '<div class="cmdk-loading-spinner"></div>Searching music...';
        this.resultsContainer.appendChild(loading);
    }

    /**
     * Removes the music-search loading spinner element from the results
     * container if present.
     */
    removeMusicLoading() {
        this.resultsContainer.querySelector('[data-music-loading]')?.remove();
    }

    /**
     * Appends music search result groups (Tracks, Albums, Artists) to the
     * existing command results in the palette.
     * @param {Object.<string, Array<Object>>} musicGroups - Map of group name
     *   to array of command-style item objects representing music results.
     */
    appendMusicGroups(musicGroups) {
        this.removeMusicLoading();
        this.resultsContainer.querySelector('.cmdk-empty')?.remove();
        this.resultsContainer.querySelectorAll('[data-music-group]').forEach((el) => el.remove());

        let index = this.flatItems.length;

        for (const [heading, items] of Object.entries(musicGroups)) {
            const groupEl = document.createElement('div');
            groupEl.className = 'cmdk-group';
            groupEl.setAttribute('data-music-group', '');

            const headingEl = document.createElement('div');
            headingEl.className = 'cmdk-group-heading';
            headingEl.textContent = heading;
            groupEl.appendChild(headingEl);

            for (const item of items) {
                const itemEl = this.createItemElement(item, index);
                groupEl.appendChild(itemEl);
                this.flatItems.push(item);
                index++;
            }

            this.resultsContainer.appendChild(groupEl);
        }
    }

    /**
     * Groups an array of objects by a specified property key.
     * @param {Array<Object>} items - The items to group.
     * @param {string} key - The property name to group by.
     * @returns {Object.<string, Array<Object>>} An object mapping each unique
     *   key value to the array of items sharing that value.
     */
    groupBy(items, key) {
        const groups = /** @type {Record<string, any[]>} */ ({});
        for (const item of items) {
            const group = item[key] || 'Other';
            if (!groups[group]) groups[group] = [];
            groups[group].push(item);
        }
        return groups;
    }

    /**
     * Clears the results container and renders the provided groups of command
     * items, updating the flat item index for keyboard navigation.
     * @param {Object.<string, Array<Object>>} groups - Map of group heading to
     *   array of command item objects.
     */
    renderGroups(groups) {
        this.resultsContainer.innerHTML = '';
        this.flatItems = [];
        let index = 0;

        const groupEntries = Object.entries(groups);
        if (groupEntries.length === 0) {
            const query = this.input.value.trim();
            if (query) {
                const empty = document.createElement('div');
                empty.className = 'cmdk-empty';
                empty.textContent = 'No commands found';
                this.resultsContainer.appendChild(empty);
            }
            return;
        }

        for (const [heading, items] of groupEntries) {
            const groupEl = document.createElement('div');
            groupEl.className = 'cmdk-group';

            const headingEl = document.createElement('div');
            headingEl.className = 'cmdk-group-heading';
            headingEl.textContent = heading;
            groupEl.appendChild(headingEl);

            for (const item of items) {
                const itemEl = this.createItemElement(item, index);
                groupEl.appendChild(itemEl);
                this.flatItems.push(item);
                index++;
            }

            this.resultsContainer.appendChild(groupEl);
        }

        this.updateSelection();
    }

    /**
     * Creates and returns a DOM element representing a single palette item,
     * with icon, label, optional description, optional keyboard shortcut, and
     * click/hover event listeners.
     * @param {object} item - The command or music item descriptor.
     * @param {number} index - The flat list index used for selection tracking.
     * @returns {HTMLElement} The constructed palette item element.
     */
    createItemElement(item, index) {
        const el = document.createElement('div');
        el.className = 'cmdk-item';
        el.id = `cmdk-item-${index}`;
        el.setAttribute('role', 'option');
        el.setAttribute('data-index', String(index));
        el.setAttribute('aria-selected', index === this.selectedIndex ? 'true' : 'false');
        if (index === this.selectedIndex) el.setAttribute('data-selected', 'true');

        let iconHtml = '';
        if (item.image) {
            iconHtml = `<div class="cmdk-item-icon"><img src="${escapeHtml(item.image)}" crossorigin="anonymous" alt="" loading="lazy" /></div>`;
        } else if (item.icon && ICONS[item.icon]) {
            iconHtml = `<div class="cmdk-item-icon">${ICONS[item.icon](ICON_SIZE)}</div>`;
        }

        let shortcutHtml = '';
        if (item.shortcut) {
            const keys = item.shortcut.split('+');
            shortcutHtml = `<div class="cmdk-item-shortcut">${keys.map((k) => `<kbd>${escapeHtml(k)}</kbd>`).join('')}</div>`;
        }

        const descHtml = item.description
            ? `<span class="cmdk-item-description">${escapeHtml(item.description)}</span>`
            : '';

        el.innerHTML = `${iconHtml}<div class="cmdk-item-content"><span class="cmdk-item-label">${escapeHtml(item.label)}</span>${descHtml}</div>${shortcutHtml}`;

        el.addEventListener('click', async () => {
            this.selectedIndex = index;
            await this.executeSelected();
        });

        el.addEventListener('mouseenter', () => {
            this.selectedIndex = index;
            this.updateSelection();
        });

        return el;
    }

    /**
     * Synchronises the visual selected state of all palette items with the
     * current {@link CommandPalette#selectedIndex}, scrolling the active item
     * into view and updating ARIA attributes.
     */
    updateSelection() {
        const items = this.resultsContainer.querySelectorAll('.cmdk-item');
        items.forEach((item) => {
            const idx = parseInt(item.getAttribute('data-index'));
            if (idx === this.selectedIndex) {
                item.setAttribute('data-selected', 'true');
                item.setAttribute('aria-selected', 'true');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.removeAttribute('data-selected');
                item.setAttribute('aria-selected', 'false');
            }
        });
        this.input.setAttribute('aria-activedescendant', `cmdk-item-${this.selectedIndex}`);
    }

    /**
     * Executes the action of the currently selected palette item. Closes the
     * palette afterwards unless the item has `keepOpen` set to `true`.
     * @async
     */
    async executeSelected() {
        const item = this.flatItems[this.selectedIndex];
        if (!item || !item.action) return;

        if (item.keepOpen) {
            try {
                await item.action();
            } catch (e) {
                console.error('Command palette action error:', e);
            }
            return;
        }

        try {
            await item.action();
        } catch (e) {
            console.error('Command palette action error:', e);
        }
        this.close();
    }

    /**
     * Renders settings items filtered by the given query string using a
     * dedicated Fuse index, or all settings when the query is empty.
     * @param {string} query - The search query string.
     */
    renderSettingsResults(query) {
        if (this.allSettings.length === 0) this.cacheAllSettings();

        let results = this.allSettings;
        if (query) {
            results = this.settingsFuse.search(query).map((r) => r.item);
        }

        const items = results.map((setting) => ({
            id: `setting-${setting.id}`,
            group: `Settings \u2022 ${setting.tab}`,
            icon: 'settings',
            label: setting.label,
            description: setting.description,
            action: () => this.navigateToSetting(setting),
        }));

        const groups = this.groupBy(items, 'group');
        this.renderGroups(groups);
    }

    /**
     * Scans the settings page DOM for all `.setting-item` elements, extracts
     * their label, description, and parent tab, stores them in
     * {@link CommandPalette#allSettings}, and rebuilds the settings Fuse index.
     */
    cacheAllSettings() {
        const settingItems = document.querySelectorAll('#page-settings .setting-item');
        this.allSettings = Array.from(settingItems)
            .map((item) => {
                const labelEl = item.querySelector('.label');
                const descEl = item.querySelector('.description');
                const tabEl = item.closest('.settings-tab-content');

                const label = labelEl ? labelEl.textContent.trim() : '';
                const description = descEl ? descEl.textContent.trim() : '';
                const tab = tabEl ? tabEl.id.replace('settings-tab-', '') : '';

                if (!item.id) {
                    const inputEl = item.querySelector('input[id], select[id], button[id]');
                    item.id = inputEl
                        ? `setting-item-for-${inputEl.id}`
                        : `setting-item-${Math.random().toString(36).substr(2, 9)}`;
                }

                return { id: item.id, label, description, tab };
            })
            .filter((s) => s.label);

        this.settingsFuse = new Fuse(this.allSettings, {
            keys: ['label', 'description'],
            includeScore: true,
            threshold: 0.4,
            ignoreLocation: true,
        });
    }

    /**
     * Navigates to the settings page, activates the appropriate tab, scrolls
     * the target setting element into view, and briefly highlights it.
     * @async
     * @param {object} setting - The setting descriptor.
     * @param {string} setting.id - DOM element ID of the setting item.
     * @param {string} setting.tab - Settings tab identifier.
     */
    async navigateToSetting(setting) {
        navigate('/settings');

        await new Promise((resolve) => setTimeout(resolve, 100));

        const tabButton = /** @type {HTMLElement | null} */ (
            document.querySelector(`.settings-tab[data-tab="${setting.tab}"]`)
        );
        if (tabButton && !tabButton.classList.contains('active')) {
            tabButton.click();
        }

        await new Promise((resolve) => setTimeout(resolve, 50));

        const settingElement = document.getElementById(setting.id);
        if (settingElement) {
            settingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            settingElement.style.transition = 'background-color 0.3s ease-out, box-shadow 0.3s ease-out';
            settingElement.style.backgroundColor = 'rgba(var(--highlight-rgb), 0.2)';
            settingElement.style.boxShadow = '0 0 0 2px rgba(var(--highlight-rgb), 0.5)';
            setTimeout(() => {
                settingElement.style.backgroundColor = '';
                settingElement.style.boxShadow = '';
            }, 2000);
        }
    }

    /**
     * Applies the specified theme via the theme manager, updates the active
     * state of theme option elements, and shows a notification.
     * @async
     * @param {string} theme - The theme identifier to apply.
     */
    async setTheme(theme) {
        const { themeManager } = await import('./storage.js');
        themeManager.setTheme(theme);
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach((opt) => {
            if (/** @type {HTMLElement} */ (opt).dataset.theme === theme) opt.classList.add('active');
            else opt.classList.remove('active');
        });
        await this.notify(`Theme set to ${theme}`);
    }

    /**
     * Toggles the audio visualizer on or off via visualizer settings, closes
     * the fullscreen cover if open, and shows a notification.
     * @async
     */
    async toggleVisualizer() {
        const { visualizerSettings } = await import('./storage.js');
        const current = visualizerSettings.isEnabled();
        visualizerSettings.setEnabled(!current);
        await this.notify(`Visualizer ${!current ? 'enabled' : 'disabled'}`);

        const overlay = document.getElementById('fullscreen-cover-overlay');
        if (overlay && getComputedStyle(overlay).display !== 'none') {
            UIRenderer.instance.closeFullscreenCover();
        }
    }

    /**
     * Sets the active visualizer preset, updating the live visualizer instance
     * if one is running, and shows a notification.
     * @async
     * @param {string} preset - The visualizer preset identifier.
     */
    async setVisualizerPreset(preset) {
        const { visualizerSettings } = await import('./storage.js');
        visualizerSettings.setPreset(preset);
        if (UIRenderer.instance.visualizer) {
            UIRenderer.instance.visualizer.setPreset(preset);
        }
        await this.notify(`Visualizer preset: ${preset}`);
    }

    /**
     * Sets both streaming and download audio quality, persisting the values to
     * localStorage and updating the relevant UI select elements.
     * @async
     * @param {string} quality - The quality level identifier (e.g. `'auto'`,
     *   `'LOW'`, `'HIGH'`, `'LOSSLESS'`, `'HI_RES_LOSSLESS'`).
     */
    async setQuality(quality) {
        const qualityNames = {
            auto: 'Auto',
            LOW: 'Low',
            HIGH: 'High',
            LOSSLESS: 'Lossless',
            HI_RES_LOSSLESS: 'Hi-Res',
        };

        if (Player.instance) {
            // Set fallback API quality (Auto maps back to Hi-Res)
            const apiQuality = quality === 'auto' ? 'HI_RES_LOSSLESS' : quality;
            Player.instance.setQuality(apiQuality);
            localStorage.setItem('playback-quality', apiQuality);

            // Set adaptive streaming quality
            localStorage.setItem('adaptive-playback-quality', quality);
            if (Player.instance.forceQuality) Player.instance.forceQuality(quality);

            const streamingSelect = /** @type {HTMLInputElement | null} */ (
                document.getElementById('streaming-quality-setting')
            );
            if (streamingSelect) streamingSelect.value = quality;
        }

        const { downloadQualitySettings } = await import('./storage.js');
        // Do not pass auto to download quality, resolve it to original fallback
        const dlQuality = quality === 'auto' ? 'HI_RES_LOSSLESS' : quality;
        downloadQualitySettings.setQuality(dlQuality);
        const downloadSelect = /** @type {HTMLInputElement | null} */ (
            document.getElementById('download-quality-setting')
        );
        if (downloadSelect) downloadSelect.value = dlQuality;

        await this.notify(`Quality set to ${qualityNames[quality] || quality}`);
    }

    /**
     * Sets a sleep timer on the player for the specified number of minutes and
     * shows a notification.
     * @async
     * @param {number} minutes - Duration in minutes after which playback stops.
     */
    async setSleepTimer(minutes) {
        if (Player.instance) {
            Player.instance.setSleepTimer(minutes);
            await this.notify(`Sleep timer: ${minutes} minutes`);
        }
    }

    /**
     * Iterates the current playback queue and likes any tracks that are not
     * already favourited, then shows a summary notification.
     * @async
     */
    async likeAllInQueue() {
        const player = Player.instance;
        const ui = UIRenderer.instance;
        if (!player || !ui) return;

        const queue = player.getCurrentQueue();
        if (queue.length === 0) {
            await this.notify('Queue is empty');
            return;
        }

        const { handleTrackAction } = await import('./events.js');
        const scrobbler = window.monochromeScrobbler;

        let likedCount = 0;
        await this.notify('Liking all tracks in queue...');
        for (const track of queue) {
            const isLiked = await db.isFavorite('track', track.id);
            if (!isLiked) {
                await handleTrackAction('toggle-like', track, player, ui.api, ui.lyricsManager, 'track', ui, scrobbler);
                likedCount++;
            }
        }
        await this.notify(`Liked ${likedCount} new track(s)`);
    }

    /**
     * Downloads all tracks currently in the playback queue at the user's
     * configured download quality.
     * @async
     */
    async downloadQueue() {
        const player = Player.instance;
        const ui = UIRenderer.instance;
        if (!player || !ui) return;

        const queue = player.getCurrentQueue();
        if (queue.length === 0) {
            await this.notify('Queue is empty');
            return;
        }

        const { downloadTracks } = await import('./downloads.js');
        const { downloadQualitySettings } = await import('./storage.js');
        await downloadTracks(queue, ui.api, downloadQualitySettings.getQuality(), ui.lyricsManager);
    }

    /**
     * Creates a new playlist with a date-stamped default name, navigates to
     * the library, and shows a notification.
     * @async
     */
    async createPlaylist() {
        const name = `New Playlist ${new Date().toLocaleDateString()}`;
        await db.createPlaylist(name);
        navigate('/library');
        await this.notify('Playlist created');
    }

    /**
     * Creates a new library folder with a date-stamped default name, navigates
     * to the library, and shows a notification.
     * @async
     */
    async createFolder() {
        const name = `New Folder ${new Date().toLocaleDateString()}`;
        await db.createFolder(name);
        navigate('/library');
        await this.notify('Folder created');
    }

    /**
     * Clears the API cache and shows a notification on success.
     * @async
     */
    async clearCache() {
        const api = UIRenderer.instance.api;
        if (api) {
            await api.clearCache();
            await this.notify('Cache cleared');
        }
    }

    /**
     * Displays a temporary notification banner with the given message.
     * @async
     * @param {string} message - The message text to display.
     */
    async notify(message) {
        await import('./downloads.js').then((m) => m.showNotification(message)).catch(console.error);
    }
}

new CommandPalette();
