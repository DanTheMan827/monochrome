import PlayIcon from '../../assets/icons/play.svg?react';
import ShuffleIcon from '../../assets/icons/shuffle.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';
import HeartIcon from '../../assets/icons/heart.svg?react';
import SearchIcon from '../../assets/icons/search.svg?react';
import RefreshIcon from '../../assets/icons/rotate-cw.svg?react';

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
              <PlayIcon width={20} height={20} fill="currentColor" />
              <span>Play</span>
            </button>
            <button id="shuffle-playlist-btn" className="btn-primary" title="Shuffle">
              <ShuffleIcon width={18} height={18} />
              <span>Shuffle</span>
            </button>
            <button id="download-playlist-btn" className="btn-primary" title="Download">
              <DownloadIcon width={20} height={20} />
              <span>Download</span>
            </button>
            <button
              id="like-playlist-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="playlist"
              title="Save to Favorites"
            >
              <HeartIcon width={20} height={20} className="heart-icon" />
              <span>Save</span>
            </button>
          </div>
        </div>
      </header>
      <form className="track-list-search-container" onSubmit={(e) => e.preventDefault()}>
        <SearchIcon width={20} height={20} className="search-icon" />
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
            <RefreshIcon width={18} height={18} />
          </button>
        </div>
        <div className="track-list" id="playlist-detail-recommended"></div>
      </section>
    </section>
  );
}
