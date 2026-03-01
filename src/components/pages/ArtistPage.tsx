import RadioIcon from '../../assets/icons/radio.svg?react';
import ShuffleIcon from '../../assets/icons/shuffle.svg?react';
import MusicNoteIcon from '../../assets/icons/music-note.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';
import HeartIcon from '../../assets/icons/heart.svg?react';

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
              <RadioIcon width={20} height={20} />
              <span>Radio</span>
            </button>
            <button id="shuffle-artist-btn" className="btn-primary" title="Shuffle">
              <ShuffleIcon width={18} height={18} />
              <span>Shuffle</span>
            </button>
            <button id="artist-mix-btn" className="btn-primary" style={{ display: 'none' }} title="Mix">
              <MusicNoteIcon width={20} height={20} />
              <span>Mix</span>
            </button>
            <button id="download-discography-btn" className="btn-primary" title="Download">
              <DownloadIcon width={20} height={20} />
              <span>Download</span>
            </button>
            <button
              id="like-artist-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="artist"
              title="Save to Favorites"
            >
              <HeartIcon width={20} height={20} className="heart-icon" />
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
