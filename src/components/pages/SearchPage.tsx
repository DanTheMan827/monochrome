export function SearchPage() {
  return (
    <div id="page-search" className="page">
      <h2 className="section-title" id="search-results-title">Search Results</h2>
      <div className="search-tabs">
        <button className="search-tab active" data-tab="tracks">Tracks</button>
        <button className="search-tab" data-tab="albums">Albums</button>
        <button className="search-tab" data-tab="artists">Artists</button>
        <button className="search-tab" data-tab="playlists">Playlists</button>
      </div>
      <div className="search-tab-content active" id="search-tab-tracks">
        <div className="track-list" id="search-tracks-container"></div>
      </div>
      <div className="search-tab-content" id="search-tab-albums">
        <div className="card-grid" id="search-albums-container"></div>
      </div>
      <div className="search-tab-content" id="search-tab-artists">
        <div className="card-grid" id="search-artists-container"></div>
      </div>
      <div className="search-tab-content" id="search-tab-playlists">
        <div className="card-grid" id="search-playlists-container"></div>
      </div>
    </div>
  );
}
