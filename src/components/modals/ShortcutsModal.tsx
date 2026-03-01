import { useModalStore } from '../../store/modalStore';

export function ShortcutsModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="shortcuts-modal" className={`modal ${isOpen('shortcuts') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content medium">
                <div className="shortcuts-header">
                    <h3>Keyboard Shortcuts</h3>
                    <button className="close-shortcuts">&times;</button>
                </div>
                <div className="shortcuts-content">
                    <div className="shortcut-item"><kbd>Space</kbd><span>Play / Pause</span></div>
                    <div className="shortcut-item"><kbd>→</kbd><span>Seek forward 10s</span></div>
                    <div className="shortcut-item"><kbd>←</kbd><span>Seek backward 10s</span></div>
                    <div className="shortcut-item"><kbd>Shift</kbd> + <kbd>→</kbd><span>Next track</span></div>
                    <div className="shortcut-item"><kbd>Shift</kbd> + <kbd>←</kbd><span>Previous track</span></div>
                    <div className="shortcut-item"><kbd>↑</kbd><span>Volume up</span></div>
                    <div className="shortcut-item"><kbd>↓</kbd><span>Volume down</span></div>
                    <div className="shortcut-item"><kbd>M</kbd><span>Mute / Unmute</span></div>
                    <div className="shortcut-item"><kbd>S</kbd><span>Toggle shuffle</span></div>
                    <div className="shortcut-item"><kbd>R</kbd><span>Toggle repeat</span></div>
                    <div className="shortcut-item"><kbd>Q</kbd><span>Open queue</span></div>
                    <div className="shortcut-item"><kbd>L</kbd><span>Toggle lyrics</span></div>
                    <div className="shortcut-item"><kbd>/</kbd><span>Focus search</span></div>
                    <div className="shortcut-item"><kbd>Esc</kbd><span>Close modals</span></div>
                </div>
            </div>
        </div>
    );
}
