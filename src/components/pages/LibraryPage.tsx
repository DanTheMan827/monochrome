import ShuffleIcon from '../../assets/icons/shuffle.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';
import FolderIcon from '../../assets/icons/folder.svg?react';

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
              <ShuffleIcon width={16} height={16} />
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
              <DownloadIcon width={16} height={16} />
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
                <FolderIcon width={20} height={20} style={{ marginRight: '8px' }} />
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
