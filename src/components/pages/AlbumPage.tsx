export function AlbumPage() {
  return (
    <div id="page-album" className="page">
      <header className="detail-header">
        <img
          id="album-detail-image"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt=""
          className="detail-header-image"
        />
        <div className="detail-header-info">
          <h1 className="title" id="album-detail-title"></h1>
          <div className="meta" id="album-detail-meta"></div>
          <div className="meta" id="album-detail-producer"></div>
          <div className="detail-header-actions">
            <button id="play-album-btn" className="btn-primary" title="Play Album">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="7 3 21 12 7 21 7 3"></polygon>
              </svg>
              <span>Play Album</span>
            </button>
            <button id="shuffle-album-btn" className="btn-primary" title="Shuffle">
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
            <button id="album-mix-btn" className="btn-primary" style={{ display: 'none' }} title="Mix">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                />
              </svg>
              <span>Mix</span>
            </button>
            <button id="download-album-btn" className="btn-primary" title="Download">
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
            <button id="add-album-to-playlist-btn" className="btn-secondary" title="Add to Playlist">
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
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add to Playlist</span>
            </button>
            <button
              id="like-album-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="album"
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
      <div className="album-content-layout">
        <div className="track-list" id="album-detail-tracklist"></div>

        <section
          className="content-section"
          id="album-section-more-albums"
          style={{ display: 'none', marginTop: '3rem' }}
        >
          <h2 className="section-title" id="album-title-more-albums">from Artist</h2>
          <div className="card-grid" id="album-detail-more-albums"></div>
        </section>

        <section className="content-section" id="album-section-eps" style={{ display: 'none', marginTop: '3rem' }}>
          <h2 className="section-title" id="album-title-eps">EPs and Singles</h2>
          <div className="card-grid" id="album-detail-eps"></div>
        </section>

        <section
          className="content-section"
          id="album-section-similar-artists"
          style={{ display: 'none', marginTop: '3rem' }}
        >
          <h2 className="section-title">Similar Artists</h2>
          <div className="card-grid" id="album-detail-similar-artists"></div>
        </section>

        <section
          className="content-section"
          id="album-section-similar-albums"
          style={{ display: 'none', marginTop: '3rem' }}
        >
          <h2 className="section-title">Similar Albums</h2>
          <div className="card-grid" id="album-detail-similar-albums"></div>
        </section>
      </div>
    </div>
  );
}
