import PlayIcon from '../../assets/icons/play.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';

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
              <PlayIcon width={20} height={20} fill="currentColor" />
              <span>Shuffle Play</span>
            </button>
            <button id="download-tracker-artist-btn" className="btn-primary" title="Download">
              <DownloadIcon width={20} height={20} />
              <span>Download All</span>
            </button>
          </div>
        </div>
      </header>
      <div id="tracker-artist-projects-container"></div>
    </div>
  );
}
