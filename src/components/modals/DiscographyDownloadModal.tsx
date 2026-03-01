import { useModalStore } from '../../store/modalStore';

export function DiscographyDownloadModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="discography-download-modal" className={`modal ${isOpen('discographyDownload') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content" style={{ maxWidth: '500px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0' }}>Download Discography</h3>
                    <button
                        className="close-modal-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '24px',
                            cursor: 'pointer',
                            color: 'var(--muted-foreground)',
                        }}
                    >
                        &times;
                    </button>
                </div>
                <p style={{ marginBottom: '1rem', color: 'var(--muted-foreground)' }}>
                    Select which releases to download for <span id="discography-artist-name"></span>:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" id="download-albums" defaultChecked />
                        <span>Albums (<span id="albums-count">0</span>)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" id="download-eps" />
                        <span>EPs (<span id="eps-count">0</span>)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" id="download-singles" />
                        <span>Singles (<span id="singles-count">0</span>)</span>
                    </label>
                </div>
                <div className="modal-actions" style={{ marginTop: '1.5rem' }}>
                    <button className="btn-secondary" id="cancel-discography-download">Cancel</button>
                    <button className="btn-primary" id="start-discography-download">Download</button>
                </div>
            </div>
        </div>
    );
}
