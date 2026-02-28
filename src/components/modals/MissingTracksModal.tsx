import { useModalStore } from '../../store/modalStore';

export function MissingTracksModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="missing-tracks-modal" className={`modal ${isOpen('missingTracks') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content wide">
                <div className="missing-tracks-header">
                    <h3>Note</h3>
                    <button className="close-missing-tracks">&times;</button>
                </div>
                <div className="missing-tracks-content">
                    <p>
                        Unfortunately, some songs weren&apos;t able to be added. This could be an issue with our import
                        system - try searching for the song and adding it. It could also be due to Monochrome not having
                        the song :(
                    </p>
                    <div className="missing-tracks-list">
                        <h4>Missing Tracks:</h4>
                        <ul id="missing-tracks-list-ul"></ul>
                    </div>
                </div>
                <div className="missing-tracks-actions">
                    <button className="btn-secondary" id="close-missing-tracks-btn">OK</button>
                </div>
            </div>
        </div>
    );
}
