export function PlaylistPage() {
  return (
    <section id="page-playlist" className="page">
      <header className="detail-header">
        <div className="detail-header-cover-container">
          <img
            id="playlist-detail-image"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            className="detail-header-image"
            alt="Playlist Cover"
          />
          <div id="playlist-detail-collage" className="detail-header-collage" style={{ display: 'none' }}></div>
        </div>
        <div className="detail-header-info">
          <h1 className="title" id="playlist-detail-title"></h1>
          <div className="meta" id="playlist-detail-meta"></div>
          <div className="meta" id="playlist-detail-description"></div>
          <div className="detail-header-actions">
            <button id="play-playlist-btn" className="btn-primary" title="Play">
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
            <button id="shuffle-playlist-btn" className="btn-primary" title="Shuffle">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
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
              <span>Shuffle</span>
            </button>
            <button id="download-playlist-btn" className="btn-primary" title="Download">
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
            <button
              id="like-playlist-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="playlist"
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
          </div>
        </div>
      </header>
      <form className="track-list-search-container" onSubmit={(e) => e.preventDefault()}>
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
          className="search-icon"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="search"
          id="track-list-search-input"
          placeholder="Search tracks..."
          className="track-list-search-input"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="search-clear-btn btn-icon"
          title="Clear search"
          style={{ display: 'none' }}
        >
          &times;
        </button>
      </form>
      <div id="playlist-detail-tracklist" className="track-list"></div>

      <section
        className="content-section"
        id="playlist-section-recommended"
        style={{ display: 'none', marginTop: '3rem' }}
      >
        <div className="section-header-row">
          <div>
            <h2 className="section-title">Recommended Songs</h2>
            <p style={{ color: 'grey', marginBottom: '15px' }}>Suggested Songs From Your Playlist</p>
          </div>
          <button
            id="refresh-recommended-songs-btn"
            className="btn-secondary"
            title="Refresh Recommendations"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
            </svg>
          </button>
        </div>
        <div className="track-list" id="playlist-detail-recommended"></div>
      </section>
    </section>
  );
}
