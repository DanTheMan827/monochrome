export function ContextMenu() {
    return (
        <div id="context-menu">
            <ul>
                <li data-action="shuffle-play-card" data-type-filter="album,playlist,mix,user-playlist">
                    Shuffle play
                </li>
                <li data-action="start-mix" data-type-filter="album,track">Start mix</li>
                <li data-action="play-next">Play next</li>
                <li data-action="add-to-queue">Add to queue</li>
                <li
                    data-action="toggle-like"
                    data-label-track="Like"
                    data-label-album="Save album to library"
                    data-label-playlist="Save playlist to library"
                >
                    Like
                </li>
                <li data-action="toggle-pin" data-type-filter="album,artist,playlist,user-playlist">Pin</li>
                <li data-action="add-to-playlist" data-type-filter="track">Add to playlist</li>
                <li data-action="go-to-artist" data-type-filter="track,album">Go to artist</li>
                <li data-action="go-to-album" data-type-filter="track">Go to album</li>
                <li data-action="copy-link">Copy link</li>
                <li data-action="open-in-new-tab">Open in new tab</li>
                <li data-action="track-info" data-type-filter="track">Track info</li>
                <li data-action="open-original-url" data-type-filter="track">Open original URL</li>
                <li data-action="download">Download</li>
                <li className="separator"></li>
                <li
                    data-action="block-track"
                    data-type-filter="track"
                    data-label-block="Block track"
                    data-label-unblock="Unblock track"
                >
                    Block track
                </li>
                <li
                    data-action="block-album"
                    data-type-filter="album,track"
                    data-label-block="Block album"
                    data-label-unblock="Unblock album"
                >
                    Block album
                </li>
                <li
                    data-action="block-artist"
                    data-type-filter="track,album,artist"
                    data-label-block="Block artist"
                    data-label-unblock="Unblock artist"
                >
                    Block artist
                </li>
            </ul>
        </div>
    );
}
