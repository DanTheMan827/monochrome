import PlayIcon from '../../assets/icons/play.svg?react';
import MicIcon from '../../assets/icons/mic.svg?react';
import UploadIcon from '../../assets/icons/upload.svg?react';
import HeartIcon from '../../assets/icons/heart.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';

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
              <PlayIcon width={20} height={20} fill="currentColor" />
              <span>Play</span>
            </button>
            <button id="track-lyrics-btn" className="btn-secondary" title="Lyrics">
              <MicIcon width={20} height={20} />
              <span>Lyrics</span>
            </button>
            <button id="share-track-btn" className="btn-secondary" title="Share">
              <UploadIcon width={20} height={20} />
              <span>Share</span>
            </button>
            <button
              id="like-track-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="track"
              title="Save to Favorites"
            >
              <HeartIcon width={20} height={20} className="heart-icon" />
              <span>Save</span>
            </button>
            <button id="download-track-btn" className="btn-secondary" title="Download">
              <DownloadIcon width={20} height={20} />
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
