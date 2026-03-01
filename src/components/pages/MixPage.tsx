import PlayIcon from '../../assets/icons/play.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';
import HeartIcon from '../../assets/icons/heart.svg?react';

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
              <PlayIcon width={20} height={20} fill="currentColor" />
              <span>Play</span>
            </button>
            <button id="download-mix-btn" className="btn-primary" title="Download">
              <DownloadIcon width={20} height={20} />
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
              <HeartIcon width={20} height={20} className="heart-icon" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </header>
      <div id="mix-detail-tracklist" className="track-list"></div>
    </section>
  );
}
