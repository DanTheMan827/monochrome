import PlayIcon from '../../assets/icons/play.svg?react';
import ShuffleIcon from '../../assets/icons/shuffle.svg?react';
import MusicNoteIcon from '../../assets/icons/music-note.svg?react';
import DownloadIcon from '../../assets/icons/download.svg?react';
import PlusIcon from '../../assets/icons/plus.svg?react';
import HeartIcon from '../../assets/icons/heart.svg?react';

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
              <PlayIcon width={20} height={20} fill="currentColor" />
              <span>Play Album</span>
            </button>
            <button id="shuffle-album-btn" className="btn-primary" title="Shuffle">
              <ShuffleIcon width={18} height={18} />
              <span>Shuffle</span>
            </button>
            <button id="album-mix-btn" className="btn-primary" style={{ display: 'none' }} title="Mix">
              <MusicNoteIcon width={20} height={20} />
              <span>Mix</span>
            </button>
            <button id="download-album-btn" className="btn-primary" title="Download">
              <DownloadIcon width={20} height={20} />
              <span>Download</span>
            </button>
            <button id="add-album-to-playlist-btn" className="btn-secondary" title="Add to Playlist">
              <PlusIcon width={20} height={20} />
              <span>Add to Playlist</span>
            </button>
            <button
              id="like-album-btn"
              className="btn-secondary like-btn"
              data-action="toggle-like"
              data-type="album"
              title="Save to Favorites"
            >
              <HeartIcon width={20} height={20} className="heart-icon" />
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
