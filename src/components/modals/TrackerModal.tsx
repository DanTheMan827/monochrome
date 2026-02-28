import { useModalStore } from '../../store/modalStore';

export function TrackerModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="tracker-modal" className={`modal tracker-modal ${isOpen('tracker') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content wide" style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
                <header className="detail-header" style={{ marginBottom: '1rem', paddingBottom: '0' }}>
                    <img
                        id="tracker-header-image"
                        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                        className="detail-header-image"
                        style={{ width: '140px', height: '140px', boxShadow: 'var(--shadow-md)' }}
                        alt=""
                    />
                    <div className="detail-header-info">
                        <div className="type">Unreleased Project</div>
                        <h1 id="tracker-header-title" className="title" style={{ fontSize: '2rem' }}></h1>
                        <div id="tracker-header-meta" className="meta"></div>
                        <div className="detail-header-actions">
                            <button className="btn-secondary" id="close-tracker-modal">Close</button>
                        </div>
                    </div>
                </header>
                <div
                    id="tracker-filters"
                    style={{ padding: '0 2rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
                ></div>
                <div id="tracker-tracklist" className="track-list" style={{ overflowY: 'auto', flex: '1' }}>
                    <div className="track-list-header">
                        <span style={{ width: '40px', textAlign: 'center' }}>#</span>
                        <span>Title</span>
                        <span className="duration-header">Duration</span>
                        <span style={{ display: 'flex', justifyContent: 'flex-end', opacity: 0.8 }}>Menu</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
