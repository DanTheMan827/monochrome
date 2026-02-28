import { useModalStore } from '../../store/modalStore';

export function PlaylistModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="playlist-modal" className={`modal ${isOpen('playlist') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <h3 id="playlist-modal-title">Create Playlist</h3>
                <input
                    type="text"
                    id="playlist-name-input"
                    className="template-input"
                    placeholder="Playlist name"
                    style={{ margin: '1rem 0' }}
                />
                <div
                    id="playlist-cover-wrapper"
                    style={{ margin: '0.5rem 0', display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}
                >
                    <input
                        type="url"
                        id="playlist-cover-input"
                        className="template-input"
                        placeholder="Cover image URL"
                        style={{ flex: '1', margin: '0', display: 'none' }}
                    />
                    <input type="file" id="playlist-cover-file-input" accept="image/*" style={{ display: 'none' }} />
                    <button
                        type="button"
                        id="playlist-cover-upload-btn"
                        className="template-btn"
                        style={{
                            flex: '1',
                            padding: '0.5rem',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
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
                        <span id="playlist-cover-btn-text">Upload</span>
                    </button>
                    <button
                        type="button"
                        id="playlist-cover-toggle-url-btn"
                        className="template-btn"
                        style={{ padding: '0.5rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        title="Switch to URL input"
                    >
                        or URL
                    </button>
                </div>
                <div
                    id="playlist-cover-upload-status"
                    style={{ display: 'none', margin: '-0.25rem 0 0.5rem 0', fontSize: '0.75rem', opacity: 0.8 }}
                >
                    <span id="playlist-cover-upload-text"></span>
                </div>
                <textarea
                    id="playlist-description-input"
                    className="template-input"
                    placeholder="Description (optional)"
                    style={{ margin: '0.5rem 0', minHeight: '80px', resize: 'vertical' }}
                ></textarea>
                <br />
                <div
                    id="import-section"
                    style={{
                        display: 'none',
                        margin: '1rem 0',
                        padding: '1rem',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        background: 'var(--background-secondary)',
                    }}
                >
                    <div
                        className="import-tabs"
                        style={{
                            display: 'flex',
                            gap: '0.5rem',
                            marginBottom: '1rem',
                            borderBottom: '1px solid var(--border)',
                            paddingBottom: '0.5rem',
                        }}
                    >
                        <button
                            type="button"
                            className="import-tab active"
                            data-import-type="csv"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                opacity: 0.7,
                            }}
                        >
                            CSV
                        </button>
                        <button
                            type="button"
                            className="import-tab"
                            data-import-type="jspf"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                opacity: 0.7,
                            }}
                        >
                            JSPF
                        </button>
                        <button
                            type="button"
                            className="import-tab"
                            data-import-type="xspf"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                opacity: 0.7,
                            }}
                        >
                            XSPF
                        </button>
                        <button
                            type="button"
                            className="import-tab"
                            data-import-type="xml"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                opacity: 0.7,
                            }}
                        >
                            XML
                        </button>
                        <button
                            type="button"
                            className="import-tab"
                            data-import-type="m3u"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--foreground)',
                                cursor: 'pointer',
                                padding: '0.25rem 0.5rem',
                                opacity: 0.7,
                            }}
                        >
                            M3U
                        </button>
                    </div>

                    <div id="csv-import-panel" className="import-panel active">
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Import from CSV</p>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button
                                type="button"
                                id="csv-spotify-btn"
                                className="btn-secondary"
                                style={{ flex: '1', opacity: 0.7 }}
                            >
                                Spotify
                            </button>
                            <button
                                type="button"
                                id="csv-apple-btn"
                                className="btn-secondary"
                                style={{ flex: '1', opacity: 0.7 }}
                            >
                                Apple Music
                            </button>
                            <button type="button" id="csv-ytm-btn" className="btn-secondary" style={{ flex: '1', opacity: 0.7 }}>
                                YouTube Music
                            </button>
                        </div>

                        <div id="csv-spotify-guide" style={{ display: 'none', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.8rem', margin: '0' }}>
                                Please use{' '}
                                <a href="https://exportify.app/" target="_blank" style={{ textDecoration: 'underline' }} rel="noreferrer">
                                    Exportify
                                </a>{' '}
                                to export your Spotify playlist into a .csv.
                            </p>
                        </div>

                        <div id="csv-apple-guide" style={{ display: 'none', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.8rem', margin: '0' }}>
                                Please use{' '}
                                <a
                                    href="https://www.tunemymusic.com/transfer/spotify-to-apple-music"
                                    target="_blank"
                                    style={{ textDecoration: 'underline' }} rel="noreferrer"
                                >
                                    TuneMyMusic
                                </a>{' '}
                                to export your Apple Music playlist into a .csv. <br /><span style={{ opacity: 0.7 }}>
                                    (Apple Music imports are prone to errors)</span
                                >
                            </p>
                        </div>

                        <div id="csv-ytm-guide" style={{ display: 'none', marginBottom: '1rem' }}>
                            <p style={{ fontSize: '0.8rem', margin: '0 0 0.5rem 0' }}>Paste a YouTube Music Playlist URL.</p>
                            <input
                                type="text"
                                id="ytm-url-input"
                                className="template-input"
                                placeholder="https://music.youtube.com/playlist?list=..."
                                style={{ width: '100%', marginBottom: '0.5rem' }}
                            />
                            <p id="ytm-status" style={{ fontSize: '0.8rem', margin: '0', opacity: 0.7 }}></p>
                        </div>

                        <div id="csv-input-container" style={{ display: 'none' }}>
                            <input
                                type="file"
                                id="csv-file-input"
                                className="btn-secondary"
                                accept=".csv"
                                style={{ width: '100%', marginBottom: '0.5rem' }}
                            />
                            <p style={{ fontSize: '0.8rem', margin: '0', opacity: 0.7 }}>
                                Make sure its headers are in English.
                            </p>
                        </div>
                    </div>

                    <div id="jspf-import-panel" className="import-panel" style={{ display: 'none' }}>
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Import from JSPF</p>
                        <p style={{ fontSize: '0.8rem', margin: '0' }}>
                            JSPF (JSON Shareable Playlist Format) is supported by ListenBrainz and other services.
                            Import playlists with rich metadata including MusicBrainz identifiers.
                        </p>
                        <br />
                        <input
                            type="file"
                            id="jspf-file-input"
                            className="btn-secondary"
                            accept=".json,.jspf"
                            style={{ width: '100%', marginBottom: '0.5rem' }}
                        />
                    </div>

                    <div id="xspf-import-panel" className="import-panel" style={{ display: 'none' }}>
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Import from XSPF</p>
                        <p style={{ fontSize: '0.8rem', margin: '0' }}>
                            XSPF (XML Shareable Playlist Format) is a standard XML playlist format supported by many
                            media players including VLC, Audacious, and Clementine.
                        </p>
                        <br />
                        <input
                            type="file"
                            id="xspf-file-input"
                            className="btn-secondary"
                            accept=".xspf,.xml"
                            style={{ width: '100%', marginBottom: '0.5rem' }}
                        />
                    </div>

                    <div id="xml-import-panel" className="import-panel" style={{ display: 'none' }}>
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Import from XML</p>
                        <p style={{ fontSize: '0.8rem', margin: '0' }}>
                            Import playlists from generic XML formats including iTunes XML playlists, Winamp XML, and
                            other custom XML playlist formats.
                        </p>
                        <br />
                        <input
                            type="file"
                            id="xml-file-input"
                            className="btn-secondary"
                            accept=".xml"
                            style={{ width: '100%', marginBottom: '0.5rem' }}
                        />
                    </div>

                    <div id="m3u-import-panel" className="import-panel" style={{ display: 'none' }}>
                        <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Import from M3U/M3U8</p>
                        <p style={{ fontSize: '0.8rem', margin: '0' }}>
                            M3U is the most widely supported playlist format. Import from any M3U or M3U8 playlist file.
                            Track information is extracted from the extended M3U format.
                        </p>
                        <br />
                        <input
                            type="file"
                            id="m3u-file-input"
                            className="btn-secondary"
                            accept=".m3u,.m3u8"
                            style={{ width: '100%', marginBottom: '0.5rem' }}
                        />
                    </div>

                    <p style={{ fontSize: '0.8rem', margin: '0' }}>
                        <b>Warning:</b> This feature isn&apos;t perfect and is prone to errors! Please check your playlist
                        after to remove any unwanted songs that were added by the system.
                    </p>
                </div>

                <div
                    className="setting-item"
                    style={{ marginBottom: '1rem', padding: '0', border: 'none', background: 'transparent' }}
                >
                    <div className="info">
                        <span className="label">Public Playlist</span>
                        <span className="description">Visible to anyone with the link.</span>
                    </div>
                    <label className="toggle-switch">
                        <input type="checkbox" id="playlist-public-toggle" />
                        <span className="slider"></span>
                    </label>
                </div>

                <div className="modal-actions">
                    <button id="playlist-share-btn" className="btn-secondary" style={{ display: 'none' }}>Share</button>
                    <button id="playlist-modal-cancel" className="btn-secondary">Cancel</button>
                    <button id="playlist-modal-save" className="btn-primary">Save</button>
                </div>
            </div>
        </div>
    );
}
