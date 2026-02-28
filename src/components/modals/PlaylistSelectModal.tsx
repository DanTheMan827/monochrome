import { useModalStore } from '../../store/modalStore';

export function PlaylistSelectModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="playlist-select-modal" className={`modal ${isOpen('playlistSelect') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <h3>Add to Playlist</h3>
                <div id="playlist-select-list" className="modal-list">
                    {/* Options will be injected here */}
                </div>
                <div className="modal-actions">
                    <button id="playlist-select-cancel" className="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    );
}
