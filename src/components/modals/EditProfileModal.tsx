export function EditProfileModal() {
    return (
        <div id="edit-profile-modal" className="modal">
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <h3>Edit Profile</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Username</label>
                    <input type="text" id="edit-profile-username" className="template-input" placeholder="username" />
                    <p
                        id="username-error"
                        style={{ color: '#ef4444', fontSize: '0.8rem', display: 'none', marginTop: '0.25rem' }}
                    ></p>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Display Name</label>
                    <input
                        type="text"
                        id="edit-profile-display-name"
                        className="template-input"
                        placeholder="Display Name"
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Avatar URL</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                        <input
                            type="url"
                            id="edit-profile-avatar"
                            className="template-input"
                            placeholder="Avatar URL"
                            style={{ flex: '1', margin: '0', display: 'none' }}
                        />
                        <input type="file" id="edit-profile-avatar-file" accept="image/*" style={{ display: 'none' }} />
                        <button
                            type="button"
                            id="edit-profile-avatar-upload-btn"
                            className="template-btn"
                            style={{
                                flex: '1',
                                padding: '0.5rem',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: 'var(--input)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span>Upload</span>
                        </button>
                        <button
                            type="button"
                            id="edit-profile-avatar-toggle-btn"
                            className="template-btn"
                            style={{
                                padding: '0.5rem',
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap',
                                background: 'var(--input)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                            }}
                            title="Switch to URL input"
                        >
                            or URL
                        </button>
                    </div>
                    <div
                        id="edit-profile-avatar-upload-status"
                        style={{ display: 'none', marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}
                    ></div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Banner URL</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                        <input
                            type="url"
                            id="edit-profile-banner"
                            className="template-input"
                            placeholder="Banner URL"
                            style={{ flex: '1', margin: '0', display: 'none' }}
                        />
                        <input type="file" id="edit-profile-banner-file" accept="image/*" style={{ display: 'none' }} />
                        <button
                            type="button"
                            id="edit-profile-banner-upload-btn"
                            className="template-btn"
                            style={{
                                flex: '1',
                                padding: '0.5rem',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: 'var(--input)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <span>Upload</span>
                        </button>
                        <button
                            type="button"
                            id="edit-profile-banner-toggle-btn"
                            className="template-btn"
                            style={{
                                padding: '0.5rem',
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap',
                                background: 'var(--input)',
                                border: '1px solid var(--border)',
                                color: 'var(--foreground)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                            }}
                            title="Switch to URL input"
                        >
                            or URL
                        </button>
                    </div>
                    <div
                        id="edit-profile-banner-upload-status"
                        style={{ display: 'none', marginTop: '0.25rem', fontSize: '0.75rem', opacity: 0.8 }}
                    ></div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Status (Listening to...)
                    </label>
                    <div className="status-picker-container">
                        <input
                            type="text"
                            id="edit-profile-status-search"
                            className="template-input"
                            placeholder="Search for a song or album..."
                            autoComplete="off"
                        />
                        <div id="status-search-results" className="search-results-dropdown"></div>
                        <input type="hidden" id="edit-profile-status-json" />
                        <div
                            id="status-preview"
                            style={{
                                display: 'none',
                                marginTop: '0.5rem',
                                padding: '0.5rem',
                                background: 'var(--secondary)',
                                borderRadius: 'var(--radius)',
                                alignItems: 'center',
                                gap: '0.5rem',
                            }}
                        >
                            <img
                                id="status-preview-img"
                                alt="Status preview"
                                style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }}
                            />
                            <div style={{ flex: '1', minWidth: '0' }}>
                                <div
                                    id="status-preview-title"
                                    style={{
                                        fontWeight: 500,
                                        fontSize: '0.9rem',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                ></div>
                                <div
                                    id="status-preview-subtitle"
                                    style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--muted-foreground)',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                ></div>
                            </div>
                            <button id="clear-status-btn" className="btn-icon" style={{ width: '24px', height: '24px' }}>
                                &times;
                            </button>
                        </div>
                    </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Favorite Albums (Max 5)
                    </label>
                    <div
                        id="edit-favorite-albums-list"
                        style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}
                    ></div>
                    <div className="status-picker-container">
                        <input
                            type="text"
                            id="edit-favorite-albums-search"
                            className="template-input"
                            placeholder="Search for an album..."
                            autoComplete="off"
                        />
                        <div id="edit-favorite-albums-results" className="search-results-dropdown"></div>
                    </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>About Me</label>
                    <textarea
                        id="edit-profile-about"
                        className="template-input"
                        style={{ resize: 'vertical', minHeight: '80px' }}
                        placeholder="Tell us about yourself"
                    ></textarea>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Website</label>
                    <input type="url" id="edit-profile-website" className="template-input" placeholder="https://..." />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Last.fm Username</label>
                    <input type="text" id="edit-profile-lastfm" className="template-input" placeholder="Last.fm Username" />
                    <p style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                        Integrating Last.fm enables recent activity and top stats on your profile. Authorize it in{' '}
                        <strong>Settings &gt; Scrobbling</strong>. Note: Last.fm authorization is stored locally and
                        must be repeated on each device.
                    </p>
                </div>

                <h4 style={{ marginTop: '1.5rem', marginBottom: '1rem', fontSize: '1rem' }}>Privacy</h4>
                <div className="setting-item" style={{ padding: '0.5rem 0', border: 'none' }}>
                    <div className="info"><span className="label">Public Playlists</span></div>
                    <label className="toggle-switch">
                        <input type="checkbox" id="privacy-playlists-toggle" defaultChecked /><span className="slider"></span>
                    </label>
                </div>
                <div className="setting-item" style={{ padding: '0.5rem 0', border: 'none' }}>
                    <div className="info"><span className="label">Show Last.fm Link & Stats</span></div>
                    <label className="toggle-switch">
                        <input type="checkbox" id="privacy-lastfm-toggle" defaultChecked /><span className="slider"></span>
                    </label>
                </div>

                <div className="modal-actions">
                    <button id="edit-profile-cancel" className="btn-secondary">Cancel</button>
                    <button id="edit-profile-save" className="btn-primary">Save Profile</button>
                </div>
            </div>
        </div>
    );
}
