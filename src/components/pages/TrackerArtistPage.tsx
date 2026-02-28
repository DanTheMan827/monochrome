export function TrackerArtistPage() {
  return (
    <div id="page-tracker-artist" className="page">
      <header className="detail-header">
        <img
          id="tracker-artist-detail-image"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          alt=""
          className="detail-header-image artist"
        />
        <div className="detail-header-info">
          <div className="type">Unreleased Artist</div>
          <h1 className="title" id="tracker-artist-detail-name"></h1>
          <div className="meta" id="tracker-artist-detail-meta"></div>
          <div className="detail-header-actions">
            <button id="play-tracker-artist-btn" className="btn-primary" title="Shuffle Play">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="7 3 21 12 7 21 7 3"></polygon>
              </svg>
              <span>Shuffle Play</span>
            </button>
            <button id="download-tracker-artist-btn" className="btn-primary" title="Download">
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
              <span>Download All</span>
            </button>
          </div>
        </div>
      </header>
      <div id="tracker-artist-projects-container"></div>
    </div>
  );
}
