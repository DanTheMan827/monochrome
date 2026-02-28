import { useModalStore } from '../../store/modalStore';

export function SleepTimerModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="sleep-timer-modal" className={`modal ${isOpen('sleepTimer') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content" style={{ maxWidth: '300px' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Sleep Timer</h3>
                <div className="timer-options">
                    <button className="timer-option btn-secondary" data-minutes="5">5 minutes</button>
                    <button className="timer-option btn-secondary" data-minutes="15">15 minutes</button>
                    <button className="timer-option btn-secondary" data-minutes="30">30 minutes</button>
                    <button className="timer-option btn-secondary" data-minutes="60">1 hour</button>
                    <button className="timer-option btn-secondary" data-minutes="120">2 hours</button>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input
                            type="number"
                            id="custom-minutes"
                            className="template-input"
                            placeholder="Custom"
                            min="1"
                            max="480"
                        />
                        <button className="timer-option btn-primary" id="custom-timer-btn" style={{ padding: '0.5rem 1rem' }}>
                            Set
                        </button>
                    </div>
                </div>
                <div className="modal-actions" style={{ justifyContent: 'center' }}>
                    <button id="cancel-sleep-timer" className="btn-secondary">Cancel</button>
                </div>
            </div>
        </div>
    );
}
