import { useModalStore } from '../../store/modalStore';
import ChevronLeftIcon from '../../assets/icons/chevron-left.svg?react';
import SearchIcon from '../../assets/icons/search.svg?react';
import SpinnerIcon from '../../assets/icons/spinner.svg?react';

export function ThemeStoreModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="theme-store-modal" className={`modal ${isOpen('themeStore') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div
                className="modal-content wide"
                style={{ height: '80vh', display: 'flex', flexDirection: 'column', maxHeight: '80vh' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0' }}>Theme Store</h3>
                    <button
                        className="close-modal-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            cursor: 'pointer',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        &times;
                    </button>
                </div>

                <div className="search-tabs" style={{ marginBottom: '1rem' }}>
                    <button className="search-tab active" data-tab="browse">Browse</button>
                    <button className="search-tab" data-tab="upload">Upload</button>
                </div>

                <div
                    id="theme-store-details"
                    style={{ display: 'none', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
                >
                    <button
                        className="btn-secondary"
                        id="theme-details-back-btn"
                        style={{
                            alignSelf: 'flex-start',
                            marginBottom: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}
                    >
                        <ChevronLeftIcon width={16} height={16} />
                        Back
                    </button>
                    <div style={{ flex: '1', overflowY: 'auto', paddingRight: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                            <div
                                id="theme-details-preview-container"
                                style={{
                                    width: '300px',
                                    height: '220px',
                                    flexShrink: 0,
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius)',
                                }}
                            ></div>
                            <div style={{ flex: '1', minWidth: '250px' }}>
                                <h2 id="theme-details-name" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></h2>
                                <div
                                    className="meta"
                                    style={{
                                        color: 'var(--muted-foreground)',
                                        fontSize: '0.9rem',
                                        marginBottom: '1rem',
                                        lineHeight: 1.6,
                                    }}
                                >
                                    <div id="theme-details-author"></div>
                                    <div>
                                        Created: <span id="theme-details-created"></span> - Updated:{' '}
                                        <span id="theme-details-updated"></span>
                                    </div>
                                    <div>Installs: <span id="theme-details-installs">0</span></div>
                                </div>
                                <button
                                    id="theme-details-apply-btn"
                                    className="btn-primary"
                                    style={{ width: '100%', maxWidth: '200px' }}
                                >
                                    Apply Theme
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: '2rem' }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Description</h3>
                            <p
                                id="theme-details-desc"
                                style={{ whiteSpace: 'pre-wrap', color: 'var(--foreground)', lineHeight: 1.6 }}
                            ></p>
                        </div>
                    </div>
                </div>

                <div
                    id="theme-store-browse"
                    className="search-tab-content active"
                    style={{ flex: '1', overflowY: 'auto', minHeight: '0' }}
                >
                    <div className="track-list-search-container" style={{ margin: '0 0 1rem 0' }}>
                        <SearchIcon width={20} height={20} className="search-icon" />
                        <input
                            type="search"
                            id="theme-store-search"
                            placeholder="Search themes..."
                            className="track-list-search-input"
                            autoComplete="off"
                        />
                    </div>
                    <div id="community-themes-grid" className="card-grid"></div>
                    <div id="theme-store-loading" style={{ textAlign: 'center', padding: '2rem', display: 'none' }}>
                        <div className="animate-spin" style={{ display: 'inline-block' }}>
                            <SpinnerIcon width={24} height={24} />
                        </div>
                    </div>
                </div>

                <div
                    id="theme-store-upload"
                    className="search-tab-content"
                    style={{ flex: '1', overflowY: 'auto', minHeight: '0' }}
                >
                    <div
                        id="theme-upload-auth-message"
                        style={{
                            display: 'none',
                            textAlign: 'center',
                            padding: '2rem',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                        }}
                    >
                        <p>You need to be logged in to upload themes.</p>
                        <button className="btn-primary" id="theme-store-login-btn">Go to Login</button>
                    </div>
                    <form id="theme-upload-form">
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Theme Name</label>
                            <input
                                type="text"
                                id="theme-upload-name"
                                className="template-input"
                                placeholder="My Awesome Theme"
                                required
                            />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Description</label>
                            <textarea
                                id="theme-upload-desc"
                                className="template-input"
                                placeholder="Describe your theme..."
                                style={{ minHeight: '80px', resize: 'vertical' }}
                            ></textarea>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                Author Website (Optional)
                            </label>
                            <input
                                type="url"
                                id="theme-upload-website"
                                className="template-input"
                                placeholder="https://example.com"
                            />
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
                                It is recommended to create a Monochrome profile instead.
                            </p>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>CSS</label>
                            <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginBottom: '0.5rem' }}>
                                Define your CSS variables or custom styles here.{' '}
                                <a
                                    href="https://github.com/monochrome-music/monochrome/blob/main/THEME_GUIDE.md"
                                    target="_blank"
                                    style={{ textDecoration: 'underline', color: 'var(--primary)' }} rel="noreferrer"
                                >
                                    Read the Theme Guide
                                </a>
                                .
                            </p>
                            <div className="theme-editor-toolbar">
                                <div className="color-picker-group">
                                    <input type="color" id="te-bg-color" title="Background" />
                                    <input type="color" id="te-fg-color" title="Foreground" />
                                    <input type="color" id="te-primary-color" title="Primary" />
                                    <input type="color" id="te-sec-color" title="Secondary" />
                                    <input type="color" id="te-accent-color" title="Accent/Highlight" />
                                    <input type="color" id="te-card-color" title="Card Background" />
                                    <input type="color" id="te-border-color" title="Border Color" />
                                    <input type="color" id="te-muted-color" title="Muted Text" />
                                </div>
                                <div className="style-picker-group">
                                    <select id="te-font-family" title="Font Family">
                                        <option value="">Font...</option>
                                        <option value="'Inter', sans-serif">Inter</option>
                                        <option value="system-ui, -apple-system, sans-serif">System</option>
                                        <option value="'Courier New', monospace">Mono</option>
                                        <option value="'Times New Roman', serif">Serif</option>
                                    </select>
                                    <input
                                        type="text"
                                        id="te-font-custom"
                                        placeholder="Custom Font..."
                                        style={{
                                            height: '24px',
                                            padding: '0 4px',
                                            fontSize: '0.75rem',
                                            width: '100px',
                                            border: '1px solid var(--border)',
                                            borderRadius: 'var(--radius-sm)',
                                            background: 'var(--input)',
                                            color: 'var(--foreground)',
                                        }}
                                    />
                                    <select id="te-radius" title="Border Radius">
                                        <option value="">Radius...</option>
                                        <option value="0px">Square</option>
                                        <option value="4px">Small</option>
                                        <option value="8px">Medium</option>
                                        <option value="16px">Large</option>
                                    </select>
                                </div>
                                <div className="editor-actions">
                                    <button
                                        type="button"
                                        id="te-insert-template"
                                        className="btn-secondary"
                                        style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                                    >
                                        Template
                                    </button>
                                    <button
                                        type="button"
                                        id="te-toggle-preview"
                                        className="btn-secondary"
                                        style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                                    >
                                        Preview
                                    </button>
                                </div>
                            </div>
                            <textarea
                                id="theme-upload-css"
                                className="template-input"
                                style={{ minHeight: '200px', fontFamily: 'monospace', whiteSpace: 'pre' }}
                                placeholder={":root {\n    --background: #000000;\n    --foreground: #ffffff;\n    /* ... */\n}"}
                                required
                            ></textarea>
                        </div>
                        <div className="modal-actions">
                            <button type="submit" className="btn-primary">Upload Theme</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
