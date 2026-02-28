export function ArtistPage() {
  return (
    <div id="page-artist" className="page">
      <header className="detail-header">
        <img
          id="artist-detail-image"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt="Artist"
          className="detail-header-image artist"
        />
        <div className="detail-header-info">
          <h1 className="title" id="artist-detail-name"></h1>
          <div className="meta" id="artist-detail-meta"></div>
          <div id="artist-detail-socials" className="artist-socials"></div>
          <div id="artist-detail-bio" className="artist-bio"></div>
          <div className="detail-header-actions">
            <button id="play-artist-radio-btn" className="btn-primary" title="Artist Radio">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M4.5 9v6h3l5 5V4l-5 5h-3zm16 3a6 6 0 0 0-3.26-5.3l-1.48 1.48C17.31 9.21 18 10.53 18 12c0 1.47-.69 2.79-1.74 3.82l1.48 1.48A6 6 0 0 0 20.5 12z"
                />
              </svg>
              <span>Radio</span>
            </button>
            <button id="shuffle-artist-btn" className="btn-primary" title="Shuffle">
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
            <button id="artist-mix-btn" className="btn-primary" style={{ display: 'none' }} title="Mix">
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
            <button id="download-discography-btn" className="btn-primary" title="Download">
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
              id="like-artist-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="artist"
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
      <section className="content-section">
        <h2 className="section-title">Popular Tracks</h2>
        <div className="track-list" id="artist-detail-tracks"></div>
      </section>
      <section className="content-section">
        <h2 className="section-title">Albums</h2>
        <div className="card-grid" id="artist-detail-albums"></div>
      </section>
      <section className="content-section" id="artist-section-eps" style={{ display: 'none' }}>
        <h2 className="section-title">EPs and Singles</h2>
        <div className="card-grid" id="artist-detail-eps"></div>
      </section>
      <section
        className="content-section"
        id="artist-section-load-unreleased"
        style={{ display: 'none', margin: '1.5rem 0' }}
      >
        <button id="load-unreleased-btn" className="btn-primary">Load Unreleased Projects</button>
      </section>
      <section className="content-section" id="artist-section-unreleased" style={{ display: 'none' }}>
        <h2 className="section-title">Unreleased Music</h2>
        <div className="card-grid" id="artist-detail-unreleased"></div>
      </section>
      <section className="content-section" id="artist-section-similar" style={{ display: 'none' }}>
        <h2 className="section-title">Similar Artists</h2>
        <div className="card-grid" id="artist-detail-similar"></div>
      </section>
    </div>
  );
}
