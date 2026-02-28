export function MixPage() {
  return (
    <section id="page-mix" className="page">
      <header className="detail-header">
        <img
          id="mix-detail-image"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          className="detail-header-image"
          alt="Mix Cover"
        />
        <div className="detail-header-info">
          <h1 className="title" id="mix-detail-title"></h1>
          <div className="meta" id="mix-detail-meta"></div>
          <div className="meta" id="mix-detail-description"></div>
          <div className="detail-header-actions">
            <button id="play-mix-btn" className="btn-primary" title="Play">
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
            <button id="download-mix-btn" className="btn-primary" title="Download">
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
              id="like-mix-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="mix"
              title="Save to Favorites"
              style={{ display: 'none' }}
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
      <div id="mix-detail-tracklist" className="track-list"></div>
    </section>
  );
}
