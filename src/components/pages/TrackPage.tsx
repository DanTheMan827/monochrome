export function TrackPage() {
  return (
    <div id="page-track" className="page">
      <header className="detail-header">
        <img
          id="track-detail-image"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          className="detail-header-image"
          alt="Track Cover"
        />
        <div className="detail-header-info">
          <div className="type">Song</div>
          <h1 className="title" id="track-detail-title"></h1>
          <div className="meta">
            <span id="track-detail-artist"></span> • <span id="track-detail-album"></span> •{' '}
            <span id="track-detail-year"></span>
          </div>
          <div className="detail-header-actions">
            <button id="play-track-btn" className="btn-primary" title="Play">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="7 3 21 12 7 21 7 3"></polygon>
              </svg>
              <span>Play</span>
            </button>
            <button id="track-lyrics-btn" className="btn-secondary" title="Lyrics">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="8" y1="22" x2="16" y2="22" />
              </svg>
              <span>Lyrics</span>
            </button>
            <button id="share-track-btn" className="btn-secondary" title="Share">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span>Share</span>
            </button>
            <button
              id="like-track-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="track"
              title="Save to Favorites"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="heart-icon"
              >
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                ></path>
              </svg>
              <span>Save</span>
            </button>
            <button id="download-track-btn" className="btn-secondary" title="Download">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              <span>Download</span>
            </button>
          </div>
        </div>
      </header>
      <section className="content-section" id="track-album-section">
        <h2 className="section-title">More from Album</h2>
        <div className="track-list" id="track-detail-album-tracks"></div>
      </section>
      <section className="content-section" id="track-similar-section" style={{ display: 'none' }}>
        <h2 className="section-title">Similar Tracks</h2>
        <div className="track-list" id="track-detail-similar-tracks"></div>
      </section>
    </div>
  );
}
