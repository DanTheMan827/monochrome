import { useModalStore } from '../../store/modalStore';
import WarningIcon from '../../assets/icons/warning.svg?react';

export function EpilepsyWarningModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="epilepsy-warning-modal" className={`modal ${isOpen('epilepsyWarning') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <WarningIcon width={24} height={24} />
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
                        Proceed & Don&apos;t Show Again
                    </button>
                    <button id="epilepsy-cancel-btn" className="btn-secondary" style={{ width: '100%' }}>Cancel</button>
                </div>
            </div>
        </div>
    );
}
