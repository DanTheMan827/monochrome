export function SortMenu() {
    return (
        <div id="sort-menu" style={{ display: 'none' }}>
            <ul>
                <li data-sort="custom">Playlist Order</li>
                <li data-sort="added-newest" className="requires-added-date">Date Added (Newest)</li>
                <li data-sort="added-oldest" className="requires-added-date">Date Added (Oldest)</li>
                <li data-sort="title">Title (A-Z)</li>
                <li data-sort="artist">Artist (A-Z)</li>
                <li data-sort="album">Album (A-Z)</li>
            </ul>
        </div>
    );
}
