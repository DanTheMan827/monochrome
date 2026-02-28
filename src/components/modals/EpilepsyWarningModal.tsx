export function EpilepsyWarningModal() {
    return (
        <div id="epilepsy-warning-modal" className="modal">
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Photosensitivity Warning
                </h3>
                <p style={{ margin: '1rem 0', lineHeight: 1.5 }}>
                    The visualizer contains flashing lights and rapidly moving patterns that may trigger seizures for
                    people with photosensitive epilepsy.
                </p>
                <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--muted-foreground)' }}>
                    Viewer discretion is advised.
                </p>
                <div className="modal-actions" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                    <button id="epilepsy-accept-btn" className="btn-primary" style={{ width: '100%' }}>
                        Proceed & Don't Show Again
                    </button>
                    <button id="epilepsy-cancel-btn" className="btn-secondary" style={{ width: '100%' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
