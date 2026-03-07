import PocketBase, { type RecordModel } from 'pocketbase';
import { syncManager } from './accounts/pocketbase.ts';
import { authManager } from './accounts/auth.ts';
import { navigate } from './router.ts';

interface ThemeInput {
    css: string;
    id?: string;
    name?: string;
    authorName?: string;
    authorUrl?: string;
    expand?: { author?: { username?: string; display_name?: string } };
}

interface PBError {
    message?: string;
    status?: number;
    data?: { message?: string; data?: Record<string, { message: string }> };
}

const THEMES_PER_PAGE = 50;

const GENERIC_FONT_FAMILIES = [
    'serif',
    'sans-serif',
    'monospace',
    'cursive',
    'fantasy',
    'system-ui',
    'inter',
    'ibm plex mono',
    'roboto',
    'open sans',
    'lato',
    'montserrat',
    'poppins',
    'apple music',
    'sf pro display',
    'courier new',
    'times new roman',
    'arial',
    'helvetica',
    'verdana',
    'tahoma',
    'trebuchet ms',
    'impact',
    'gill sans',
];

export class ThemeStore {
    static EXPECTED_USER_ID_LENGTH = 15;
    private pb: PocketBase;
    private modal: HTMLElement | null;
    private grid: HTMLElement | null;
    private uploadForm: HTMLElement | null;
    private searchInput: HTMLElement | null;
    private loadingIndicator: HTMLElement | null;
    private _isCheckingAuth: boolean;
    private previewShadow: ShadowRoot | null;
    private detailsPreviewShadow: ShadowRoot | null;
    private previewStyleTag: HTMLStyleElement | null;
    private editingThemeId: string | null;
    constructor() {
        this.pb = syncManager.pb;
        this.modal = document.getElementById('theme-store-modal');
        this.grid = document.getElementById('community-themes-grid');
        this.uploadForm = document.getElementById('theme-upload-form');
        this.searchInput = document.getElementById('theme-store-search');
        this.loadingIndicator = document.getElementById('theme-store-loading');
        this._isCheckingAuth = false;
        this.previewShadow = null;
        this.detailsPreviewShadow = null;
        this.previewStyleTag = null;
        this.editingThemeId = null;
        this.init();
    }

    init(): void {
        document.getElementById('open-theme-store-btn')?.addEventListener('click', () => {
            this.modal?.classList.add('active');
            this.loadThemes();
        });

        this.modal?.querySelector('.close-modal-btn')?.addEventListener('click', () => {
            this.modal?.classList.remove('active');
        });

        const tabs = this.modal?.querySelectorAll('.search-tab');
        tabs?.forEach((tab: Element) => {
            tab.addEventListener('click', () => {
                tabs.forEach((t: Element) => t.classList.remove('active'));
                this.modal?.querySelectorAll('.search-tab-content').forEach((c: Element) => c.classList.remove('active'));
                const contentId = (tab as HTMLElement).dataset.tab === 'browse' ? 'theme-store-browse' : 'theme-store-upload';
                document.getElementById(contentId)?.classList.add('active');
                if ((tab as HTMLElement).dataset.tab === 'upload') {
                    this.checkAuth();
                } else {
                    this.resetEditState();
                }
            });
        });

        let debounceTimer: ReturnType<typeof setTimeout> | undefined;
        this.searchInput?.addEventListener('input', (e: Event) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.loadThemes((e.target as HTMLInputElement).value), 300);
        });

        this.uploadForm?.addEventListener('submit', (e: Event) => this.handleUpload(e));

        if (authManager) {
            authManager.onAuthStateChanged(() => {
                if (this.modal?.classList.contains('active')) {
                    this.checkAuth();
                }
            });
        }

        document.getElementById('theme-store-login-btn')?.addEventListener('click', () => {
            this.modal?.classList.remove('active');
            document.getElementById('email-auth-modal')?.classList.add('active');
        });

        document.getElementById('theme-upload-cancel-edit')?.addEventListener('click', () => {
            this.resetEditState();
        });

        this.setupEditorTools();

        document.getElementById('theme-details-back-btn')?.addEventListener('click', () => {
            this.closeThemeDetails();
        });

        this.applySavedTheme();
    }

    applySavedTheme(): void {
        const theme = localStorage.getItem('monochrome-theme');
        const css = localStorage.getItem('custom_theme_css');
        if (theme === 'custom' && css) {
            const metadataStr = localStorage.getItem('community-theme');
            let metadata: { id?: string; name?: string; author?: string } | null = null;
            if (metadataStr) {
                try {
                    metadata = JSON.parse(metadataStr);
                } catch (e) {
                    console.warn(e);
                }
            }

            if (metadata) {
                this.applyTheme({
                    css: css,
                    id: metadata.id,
                    name: metadata.name,
                    authorName: metadata.author,
                });
            } else {
                this.applyTheme(css);
            }
        }
    }

    async loadThemes(query: string = ''): Promise<void> {
        if (!this.grid) return;
        this.grid.innerHTML = '';
        if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';

        let currentUserId: string | null = null;
        if (authManager.user) {
            try {
                const record = await syncManager._getUserRecord(authManager.user.$id);
                currentUserId = record?.id ?? null;
            } catch (e) {
                console.warn('Failed to resolve user ID for theme ownership check', e);
            }
        }

        try {
            const result = await this.pb.collection('themes').getList(1, THEMES_PER_PAGE, {
                sort: '-created',
                filter: query ? `name ~ "${query}" || description ~ "${query}"` : '',
                expand: 'author',
            });
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
            if (result.items.length === 0) {
                this.grid.innerHTML = '<div class="empty-state">No themes found.</div>';
                return;
            }
            result.items.forEach((theme: RecordModel) => {
                this.grid!.appendChild(this.createThemeCard(theme, currentUserId));
            });
        } catch (err) {
            console.error('Failed to load themes:', err);
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
            this.grid.innerHTML = '<div class="empty-state">Failed to load themes.</div>';
        }
    }

    createThemeCard(theme: RecordModel, currentUserId: string | null): HTMLDivElement {
        const div = document.createElement('div');
        div.className = 'card theme-card';
        const authorName =
            theme.expand?.author?.username || theme.expand?.author?.display_name || theme.authorName || 'Unknown';

        const shortDesc = theme.description
            ? theme.description.length > 80
                ? theme.description.substring(0, 80) + '...'
                : theme.description
            : '';

        let authorHtml = this.escapeHtml(authorName);
        let isInternalProfile = false;

        if (theme.expand?.author?.username) {
            isInternalProfile = true;
            authorHtml = `<span class="author-link" style="cursor: pointer; text-decoration: underline;">${this.escapeHtml(authorName)}</span>`;
        } else if (theme.authorUrl) {
            authorHtml = `<a href="${this.escapeHtml(theme.authorUrl)}" target="_blank" style="color: inherit; text-decoration: underline;" onclick="event.stopPropagation();">${this.escapeHtml(authorName)}</a>`;
        }

        let actionBtnsHtml = '';
        if (currentUserId && theme.author === currentUserId) {
            actionBtnsHtml = `
                <div style="position: absolute; top: 0.5rem; right: 0.5rem; display: flex; gap: 0.25rem; z-index: 10;">
                    <button class="btn-icon edit-theme-btn" title="Edit Theme" style="background: rgba(0,0,0,0.6); color: white; border-radius: 50%; padding: 0.25rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-icon delete-theme-btn" title="Delete Theme" style="background: rgba(0,0,0,0.6); color: white; border-radius: 50%; padding: 0.25rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            `;
        }

        const previewStyle = this.extractPreviewStyles(theme.css);
        const previewHtml = `
            <div class="theme-card-preview" style="${previewStyle}; height: 140px; position: relative;">
                <div class="theme-card-preview-header" style="background-color: var(--card); border-bottom: 1px solid var(--border);"></div>
                <div class="theme-card-preview-body" style="background-color: var(--background);">
                    <div class="theme-card-preview-line" style="background-color: var(--foreground); width: 80%;"></div>
                    <div class="theme-card-preview-line" style="background-color: var(--muted-foreground); width: 60%;"></div>
                    <div class="theme-card-preview-line" style="background-color: var(--primary); width: 40%; margin-top: auto;"></div>
                </div>
            </div>`;

        div.innerHTML = `
            <div style="position: relative;">
                ${actionBtnsHtml}
                ${previewHtml}
            </div>
            <div class="card-info" style="margin-top: 0.75rem;">
                <div class="card-title">${this.escapeHtml(theme.name)}</div>
                <div class="card-subtitle">by ${authorHtml}</div>
                <p style="font-size: 0.8rem; color: var(--muted-foreground); margin-top: 0.25rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${this.escapeHtml(shortDesc)}
                </p>
            </div>
        `;

        div.addEventListener('click', (e: MouseEvent) => {
            if ((e.target as Element)?.closest('.delete-theme-btn')) {
                e.stopPropagation();
                this.deleteTheme(theme.id);
                return;
            }
            if ((e.target as Element).closest('.edit-theme-btn')) {
                e.stopPropagation();
                this.startEditTheme(theme as unknown as ThemeInput);
                return;
            }
            this.openThemeDetails(theme);
        });

        if (isInternalProfile) {
            const link = div.querySelector('.author-link');
            link?.addEventListener('click', (e: Event) => {
                e.stopPropagation();
                this.modal?.classList.remove('active');
                navigate(`/user/@${theme.expand?.author?.username}`);
            });
        }

        return div;
    }

    async deleteTheme(themeId: string): Promise<void> {
        if (!confirm('Are you sure you want to delete this theme?')) return;

        try {
            const fbUser = authManager.user;
            if (!fbUser) throw new Error('Not authenticated');

            await this.pb.collection('themes').delete(themeId, { f_id: fbUser.$id });
            alert('Theme deleted successfully.');
            this.loadThemes();
        } catch (err) {
            console.error('Failed to delete theme:', err);
            alert('Failed to delete theme. You might not have permission.');
        }
    }

    openThemeDetails(theme: RecordModel): void {
        const detailsView = document.getElementById('theme-store-details') as HTMLElement | null;
        const browseView = document.getElementById('theme-store-browse') as HTMLElement | null;
        const tabs = this.modal?.querySelector('.search-tabs') as HTMLElement | null;

        const nameEl = document.getElementById('theme-details-name');
        if (nameEl) nameEl.textContent = theme.name;

        const authorName: string =
            theme.expand?.author?.username || theme.expand?.author?.display_name || theme.authorName || 'Unknown';
        const authorEl = document.getElementById('theme-details-author');

        if (theme.expand?.author?.username) {
            if (authorEl) {
                authorEl.innerHTML = `by <span style="cursor: pointer; text-decoration: underline; color: var(--primary);">${this.escapeHtml(authorName)}</span>`;
                const spanEl = authorEl.querySelector('span');
                if (spanEl) {
                    spanEl.onclick = () => {
                        this.modal?.classList.remove('active');
                        navigate(`/user/@${theme.expand?.author?.username}`);
                    };
                }
            }
        } else {
            if (authorEl) authorEl.textContent = `by ${authorName}`;
        }

        const createdEl = document.getElementById('theme-details-created');
        if (createdEl) createdEl.textContent = new Date(theme.created).toLocaleDateString();
        const updatedEl = document.getElementById('theme-details-updated');
        if (updatedEl) updatedEl.textContent = new Date(theme.updated).toLocaleDateString();
        const installsEl = document.getElementById('theme-details-installs');
        if (installsEl) installsEl.textContent = String(theme.installs || 0);
        const descEl = document.getElementById('theme-details-desc');
        if (descEl) descEl.textContent = theme.description || 'No description provided.';

        const applyBtn = document.getElementById('theme-details-apply-btn');
        if (applyBtn) {
            applyBtn.onclick = async () => {
                this.applyTheme(theme);
                this.modal?.classList.remove('active');

                try {
                    const latest = await this.pb.collection('themes').getOne(theme.id);
                    await this.pb.collection('themes').update(theme.id, {
                        installs: (latest.installs || 0) + 1,
                    });
                } catch (e) {
                    console.warn('Failed to update theme installs:', e);
                }
            };
        }

        const previewContainer = document.getElementById('theme-details-preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            this.detailsPreviewShadow = previewContainer.attachShadow({ mode: 'open' });

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/styles.css';
            this.detailsPreviewShadow.appendChild(link);

            const styleTag = document.createElement('style');
            styleTag.textContent = (theme.css as string).replace(/:root/g, ':host');
            this.detailsPreviewShadow.appendChild(styleTag);

            const wrapper = document.createElement('div');
            wrapper.className = 'preview-content';
            wrapper.style.padding = '1rem';
            wrapper.style.height = '100%';
            wrapper.style.background = 'var(--background)';
            wrapper.style.color = 'var(--foreground)';
            wrapper.style.overflow = 'hidden';
            wrapper.innerHTML = `
                <div class="card" style="margin-bottom: 1rem;">
                    <div style="height: 60px; background: var(--muted); border-radius: var(--radius); margin-bottom: 0.5rem;"></div>
                    <div class="card-title">Preview</div>
                    <div class="card-subtitle">Subtitle</div>
                </div>
                <button class="btn-primary" style="margin-bottom: 0.5rem; width: 100%;">Button</button>
            `;
            this.detailsPreviewShadow.appendChild(wrapper);
        }

        if (browseView) browseView.style.display = 'none';
        if (tabs) tabs.style.display = 'none';
        if (detailsView) detailsView.style.display = 'flex';
    }

    closeThemeDetails(): void {
        const detailsView = document.getElementById('theme-store-details') as HTMLElement | null;
        const browseView = document.getElementById('theme-store-browse') as HTMLElement | null;
        const tabs = this.modal?.querySelector('.search-tabs') as HTMLElement | null;

        if (detailsView) detailsView.style.display = 'none';
        if (browseView) browseView.style.display = 'block';
        if (tabs) tabs.style.display = 'flex';

        const container = document.getElementById('theme-details-preview-container');
        if (container) container.innerHTML = '';
    }

    extractPreviewStyles(css: string): string {
        const vars = ['--background', '--foreground', '--primary', '--card', '--border', '--muted-foreground'];
        let style = '';
        vars.forEach((v) => {
            const regex = new RegExp(`${v}\\s*:\\s*([^;]+)`);
            const match = css.match(regex);
            if (match) {
                style += `${v}: ${match[1]}; `;
            }
        });
        return style;
    }

    applyTheme(theme: RecordModel | ThemeInput | string): void {
        let css: string;
        let themeObj: ThemeInput;
        if (typeof theme === 'string') {
            css = theme;
            themeObj = { css: theme, name: 'Custom Theme', authorName: 'Unknown' };
        } else {
            css = theme.css as string;
            themeObj = theme as ThemeInput;
        }

        localStorage.setItem('custom_theme_css', css);
        localStorage.setItem('monochrome-theme', 'custom');

        const metadata = {
            id: themeObj.id,
            name: themeObj.name,
            author:
                themeObj.authorName || themeObj.expand?.author?.username || themeObj.expand?.author?.display_name || 'Unknown',
        };
        localStorage.setItem('community-theme', JSON.stringify(metadata));

        let styleEl = document.getElementById('custom-theme-style');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'custom-theme-style';
            document.head.appendChild(styleEl);
        }

        const fontMatch = css.match(/--font-family:\s*([^;}]+)/);
        const urlMatch = css.match(/--font-url:\s*([^;}]+)/);

        if (fontMatch && fontMatch[1]) {
            const fontFamilyValue = fontMatch[1].trim();
            const mainFont = fontFamilyValue.split(',')[0].trim().replace(/['"]/g, '');

            const isPresetOrGeneric = GENERIC_FONT_FAMILIES.some((generic) => mainFont.toLowerCase() === generic);

            if (!isPresetOrGeneric) {
                const FONT_LINK_ID = 'monochrome-dynamic-font';
                let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;

                if (urlMatch && urlMatch[1]) {
                    const customUrl = urlMatch[1].trim().replace(/['"]/g, '');
                    console.log(`Applying custom font URL: ${customUrl}`);

                    if (customUrl.match(/\.(css)$/i) || customUrl.includes('fonts.googleapis.com')) {
                        if (!link) {
                            link = document.createElement('link');
                            link.id = FONT_LINK_ID;
                            link.rel = 'stylesheet';
                            document.head.appendChild(link);
                        }
                        link.href = customUrl;
                    } else {
                        if (link) link.remove();
                        const fontFace = `
@font-face {
    font-family: '${mainFont}';
    src: url('${customUrl}');
    font-weight: 100 900;
    font-display: swap;
}
`;
                        css = fontFace + css;
                    }
                } else {
                    console.log(`Applying custom font from theme (Google Fonts): ${mainFont}`);
                    const encodedFamily = encodeURIComponent(mainFont);
                    const url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@100;200;300;400;500;600;700;800;900&display=swap`;

                    if (!link) {
                        link = document.createElement('link');
                        link.id = FONT_LINK_ID;
                        link.rel = 'stylesheet';
                        document.head.appendChild(link);
                    }
                    link.href = url;
                }
            }
        }

        styleEl.textContent = css;

        const root = document.documentElement;
        ['background', 'foreground', 'primary', 'secondary', 'muted', 'border', 'highlight', 'font-family'].forEach(
            (key) => {
                root.style.removeProperty(`--${key}`);
            }
        );
        root.setAttribute('data-theme', 'custom');

        document.querySelectorAll('.theme-option').forEach((el) => el.classList.remove('active'));
        document.querySelector('[data-theme="custom"]')?.classList.add('active');

        // Force reflow to ensure theme changes are applied immediately
        document.documentElement.style.display = 'none';
        document.documentElement.offsetHeight;
        document.documentElement.style.display = '';

        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: 'custom' } }));
    }

    async checkAuth(): Promise<void> {
        if (this._isCheckingAuth) return;
        this._isCheckingAuth = true;

        const isLoggedIn = !!authManager?.user;

        const authMessage = document.getElementById('theme-upload-auth-message');
        const form = document.getElementById('theme-upload-form');
        const websiteInput = document.getElementById('theme-upload-website');
        const websiteContainer = websiteInput?.parentElement;

        if (isLoggedIn) {
            if (authMessage) authMessage.style.display = 'none';
            if (form) form.style.display = 'block';

            try {
                const userData = await syncManager.getUserData();
                if (userData?.profile?.username && websiteContainer) {
                    websiteContainer.style.display = 'none';
                } else if (websiteContainer) {
                    websiteContainer.style.display = 'block';
                }
            } catch (e) {
                console.warn('Failed to check profile for website input visibility', e);
            }
        } else {
            if (authMessage) authMessage.style.display = 'flex';
            if (form) form.style.display = 'none';
        }

        this._isCheckingAuth = false;
    }

    async handleUpload(e: Event): Promise<void> {
        e.preventDefault();

        const name = (document.getElementById('theme-upload-name') as HTMLInputElement).value;
        const desc = (document.getElementById('theme-upload-desc') as HTMLTextAreaElement).value;
        const css = (document.getElementById('theme-upload-css') as HTMLTextAreaElement).value;
        const website = (document.getElementById('theme-upload-website') as HTMLInputElement).value;

        const fbUser = authManager?.user;
        if (!fbUser) {
            alert('You must be logged in to upload themes.');
            return;
        }

        let userId: string | null = null;
        let userName: string | null = null;

        try {
            const dbUser = await syncManager._getUserRecord(fbUser.$id);
            if (!dbUser) {
                throw new Error('Could not find or create your user record. Please try again.');
            }

            userId = dbUser.id;
            userName = dbUser.username || dbUser.display_name || fbUser.email;

            if (userId.length !== ThemeStore.EXPECTED_USER_ID_LENGTH) {
                throw new Error(
                    `Your user ID is corrupted (${userId.length} chars, expected ${ThemeStore.EXPECTED_USER_ID_LENGTH}). ` +
                        `Please go to Settings > System > Clear Cloud Data, then log out and back in.`
                );
            }

            console.log(this.editingThemeId ? 'Updating theme:' : 'Uploading theme:', {
                name,
                author: userId,
                authorName: userName,
            });

            const formData = new FormData();
            formData.append('name', name);
            formData.append('description', desc);
            formData.append('css', css);
            formData.append('authorName', userName ?? '');
            formData.append('authorUrl', website || '');

            if (this.editingThemeId) {
                await this.pb.collection('themes').update(this.editingThemeId, formData, { f_id: fbUser.$id });
                alert('Theme updated successfully!');
            } else {
                formData.append('author', userId);
                await this.pb.collection('themes').create(formData, { f_id: fbUser.$id });
                alert('Theme uploaded successfully!');
            }

            this.resetEditState();

            const previewWindow = document.getElementById('theme-preview-window');
            const togglePreviewBtn = document.getElementById('te-toggle-preview');
            if (previewWindow) previewWindow.style.display = 'none';
            if (togglePreviewBtn) {
                togglePreviewBtn.textContent = 'Preview';
                togglePreviewBtn.classList.remove('active');
            }

            (this.modal?.querySelector('[data-tab="browse"]') as HTMLElement)?.click();
            this.loadThemes();
        } catch (err: unknown) {
            const pbErr = err as PBError;
            console.error('Upload failed:', err);
            console.error('Response data:', pbErr.data);

            const responseData: Record<string, { message: string }> = pbErr.data?.data || {};

            if (Object.keys(responseData).length > 0) {
                let msg = 'Failed to upload theme:\n';
                for (const [key, value] of Object.entries(responseData)) {
                    msg += `• ${key}: ${value.message}\n`;
                }
                alert(msg);
            } else {
                const message = pbErr.message || pbErr.data?.message || 'Unknown error';
                const debugInfo = `User ID: ${userId} (${userId?.length} chars) | Status: ${pbErr.status}`;
                console.error('Upload failed (debug info):', debugInfo);
                alert(`Failed to upload theme: ${message}`);
            }
        }
    }

    startEditTheme(theme: ThemeInput): void {
        this.editingThemeId = theme.id ?? null;

        const uploadTab = this.modal?.querySelector('[data-tab="upload"]');
        if (uploadTab) (uploadTab as HTMLElement).click();

        (document.getElementById('theme-upload-name') as HTMLInputElement).value = theme.name ?? '';
        (document.getElementById('theme-upload-desc') as HTMLTextAreaElement).value = (theme as unknown as { description?: string }).description || '';
        (document.getElementById('theme-upload-website') as HTMLInputElement).value = theme.authorUrl || '';
        (document.getElementById('theme-upload-css') as HTMLTextAreaElement).value = theme.css;

        const submitBtn = document.getElementById('theme-upload-submit-btn');
        if (submitBtn) submitBtn.textContent = 'Update Theme';

        const cancelBtn = document.getElementById('theme-upload-cancel-edit');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';

        this.updatePreview();
    }

    resetEditState(): void {
        this.editingThemeId = null;
        (document.getElementById('theme-upload-form') as HTMLFormElement | null)?.reset();

        const submitBtn = document.getElementById('theme-upload-submit-btn');
        if (submitBtn) submitBtn.textContent = 'Upload Theme';

        const cancelBtn = document.getElementById('theme-upload-cancel-edit');
        if (cancelBtn) cancelBtn.style.display = 'none';

        this.updatePreview();
    }

    escapeHtml(str: string): string {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    setupEditorTools(): void {
        const cssInput = document.getElementById('theme-upload-css') as HTMLTextAreaElement | null;
        const insertTemplateBtn = document.getElementById('te-insert-template');
        const togglePreviewBtn = document.getElementById('te-toggle-preview');
        const previewWindow = document.getElementById('theme-preview-window');

        const colorMap = {
            'te-bg-color': '--background',
            'te-fg-color': '--foreground',
            'te-primary-color': '--primary',
            'te-sec-color': '--secondary',
            'te-accent-color': '--highlight',
            'te-card-color': '--card',
            'te-border-color': '--border',
            'te-muted-color': '--muted-foreground',
        };

        Object.entries(colorMap).forEach(([id, variable]) => {
            document.getElementById(id)?.addEventListener('input', (e: Event) => {
                this.updateCssVariable(cssInput, variable, (e.target as HTMLInputElement).value);
                this.updatePreview();
            });
        });

        const styleMap: Record<string, string> = {
            'te-font-family': '--font-family',
            'te-radius': '--radius',
        };

        Object.entries(styleMap).forEach(([id, variable]) => {
            document.getElementById(id)?.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLSelectElement;
                if (target.value) {
                    this.updateCssVariable(cssInput, variable, target.value);
                    this.updatePreview();
                    target.value = '';
                }
            });
        });

        document.getElementById('te-font-custom')?.addEventListener('input', (e: Event) => {
            this.updateCssVariable(cssInput, '--font-family', (e.target as HTMLInputElement).value);
            this.updatePreview();
        });

        insertTemplateBtn?.addEventListener('click', () => {
            if (cssInput && cssInput.value.trim() && !confirm('Overwrite current CSS with template?')) return;
            if (cssInput) {
                cssInput.value = `:root {
    /* Base Colors */
    --background: #0a0a0a;
    --foreground: #ededed;
    
    /* UI Elements */
    --card: #1a1a1a;
    --card-foreground: #ededed;
    --border: #2a2a2a;
    
    /* Accents */
    --primary: #3b82f6;
    --primary-foreground: #ffffff;
    --secondary: #2a2a2a;
    --secondary-foreground: #ededed;
    
    /* Text */
    --muted: #2a2a2a;
    --muted-foreground: #a0a0a0;
    
    /* Special */
    --highlight: #3b82f6;
    --ring: #3b82f6;
    --radius: 8px;
    --font-family: 'Inter', sans-serif;
    --font-size-scale: 100%;
}`;
            }
            this.updatePreview();
        });

        togglePreviewBtn?.addEventListener('click', () => {
            if (!previewWindow) return;
            const isVisible = previewWindow.style.display !== 'none';
            if (isVisible) {
                previewWindow.style.display = 'none';
                togglePreviewBtn.textContent = 'Preview';
                togglePreviewBtn.classList.remove('active');
            } else {
                previewWindow.style.display = 'flex';
                togglePreviewBtn.textContent = 'Close Preview';
                togglePreviewBtn.classList.add('active');
                this.initPreviewWindow();
                this.updatePreview();
            }
        });

        cssInput?.addEventListener('input', () => this.updatePreview());
    }

    updateCssVariable(textarea: HTMLTextAreaElement | null, variable: string, value: string): void {
        if (!textarea) return;
        let css = textarea.value;
        const regex = new RegExp(`${variable}:\\s*[^;\\}]+(?:;|(?=\\}))`, 'g');
        const newLine = `${variable}: ${value};`;

        if (regex.test(css)) {
            css = css.replace(regex, newLine);
        } else {
            if (css.includes(':root {')) {
                css = css.replace(':root {', `:root {\n    ${newLine}`);
            } else {
                css += `\n:root {\n    ${newLine}\n}`;
            }
        }
        textarea.value = css;
    }

    initPreviewWindow(): void {
        const container = document.getElementById('theme-preview-window');
        if (!container) return;
        if (!this.previewShadow) {
            this.previewShadow = container.attachShadow({ mode: 'open' });

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = '/styles.css';
            this.previewShadow.appendChild(link);

            this.previewStyleTag = document.createElement('style');
            this.previewShadow.appendChild(this.previewStyleTag);

            const wrapper = document.createElement('div');
            wrapper.className = 'preview-content';
            wrapper.style.padding = '1rem';
            wrapper.style.height = '100%';
            wrapper.style.background = 'var(--background)';
            wrapper.style.color = 'var(--foreground)';
            wrapper.style.overflow = 'auto';

            wrapper.innerHTML = `
                <h3 style="margin-top: 0;">Preview</h3>
                <div class="card" style="margin-bottom: 1rem;">
                    <div style="height: 100px; background: var(--muted); border-radius: var(--radius); margin-bottom: 0.5rem;"></div>
                    <div class="card-title">Card Title</div>
                    <div class="card-subtitle">Subtitle</div>
                </div>
                <button class="btn-primary" style="margin-bottom: 0.5rem;">Primary Button</button>
                <button class="btn-secondary">Secondary Button</button>
                <p style="color: var(--muted-foreground);">Muted text example.</p>
            `;
            this.previewShadow.appendChild(wrapper);
        }
    }

    updatePreview(): void {
        if (!this.previewShadow || !this.previewStyleTag) return;
        const css = (document.getElementById('theme-upload-css') as HTMLTextAreaElement | null)?.value ?? '';
        const scopedCss = css.replace(/:root/g, ':host');
        this.previewStyleTag.textContent = scopedCss;
    }
}
