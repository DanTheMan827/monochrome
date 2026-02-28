export function LibraryPage() {
  return (
    <div id="page-library" className="page">
      <section className="content-section">
        <div className="library-header">
          <h2>My Playlists</h2>
          <button id="create-playlist-btn" className="btn-primary" style={{ margin: '10px 0' }}>
            Create Playlist
          </button>
          <button
            id="create-folder-btn"
            className="btn-primary"
            style={{
              margin: '10px 0 10px 10px',
              backgroundColor: 'var(--secondary)',
              color: 'var(--foreground)',
            }}
          >
            Create Folder
          </button>
        </div>
        <div className="card-grid" id="my-folders-container"></div>
        <div className="card-grid" id="my-playlists-container"></div>
      </section>

      <section className="content-section">
        <h2 className="section-title">Favorites</h2>
        <div className="search-tabs">
          <button className="search-tab active" data-tab="tracks">Liked Tracks</button>
          <button className="search-tab" data-tab="albums">Albums</button>
          <button className="search-tab" data-tab="artists">Artists</button>
          <button className="search-tab" data-tab="playlists">Playlists and Mixes</button>
          <button className="search-tab" data-tab="local">Local Files</button>
        </div>
        <div className="search-tab-content active" id="library-tab-tracks">
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              id="shuffle-liked-tracks-btn"
              className="btn-secondary"
              style={{
                display: 'none',
                width: '32px',
                height: '32px',
                padding: '0',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
              title="Shuffle Liked Tracks"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m18 14 4 4-4 4" />
                <path d="m18 2 4 4-4 4" />
                <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
                <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
                <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
              </svg>
            </button>
            <button
              id="download-liked-tracks-btn"
              className="btn-secondary"
              style={{
                display: 'none',
                width: '32px',
                height: '32px',
                padding: '0',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
              title="Download Liked Tracks"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>
          <div className="track-list" id="library-tracks-container"></div>
        </div>
        <div className="search-tab-content" id="library-tab-albums">
          <div className="card-grid" id="library-albums-container"></div>
        </div>
        <div className="search-tab-content" id="library-tab-artists">
          <div className="card-grid" id="library-artists-container"></div>
        </div>
        <div className="search-tab-content" id="library-tab-playlists">
          <div className="card-grid" id="library-playlists-container"></div>
        </div>
        <div className="search-tab-content" id="library-tab-local">
          <div className="track-list" id="library-local-container">
            <div id="local-files-intro" style={{ padding: '20px', textAlign: 'center' }}>
              <button id="select-local-folder-btn" className="btn-secondary">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: '8px' }}
                >
                  <path
                    d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                  ></path>
                </svg>
                <span id="select-local-folder-text">Select Music Folder</span>
              </button>
              <p
                id="local-browser-warning"
                style={{ display: 'none', color: '#ef4444', marginTop: '10px', fontSize: '0.9rem' }}
              >
                Please use Google Chrome or Microsoft Edge to play local files.
              </p>
              <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                Select a folder on your device to play local files. <br />
                Note: Metadata reading is basic (FLAC/MP3 tags).
              </p>
            </div>
            <div
              id="local-files-header"
              style={{
                display: 'none',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
              }}
            >
              <h3>Local Files</h3>
              <button
                id="change-local-folder-btn"
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '4px 8px' }}
              >
                Change Folder
              </button>
            </div>
            <div id="local-files-list"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
