import { useModalStore } from '../../store/modalStore';

export function EmailAuthModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="email-auth-modal" className={`modal ${isOpen('emailAuth') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <h3 style={{ textAlign: 'center', marginBottom: '10px' }}>Email Authentication</h3>
                <input
                    type="email"
                    id="auth-email"
                    className="template-input"
                    placeholder="Email Address"
                    style={{ marginBottom: '0.5rem' }}
                />
                <input
                    type="password"
                    id="auth-password"
                    className="template-input"
                    placeholder="Password"
                    style={{ marginBottom: '1rem' }}
                />
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
                    <button id="email-signin-btn" className="btn-primary" style={{ flex: '1' }}>Sign In</button>
                    <button id="email-signup-btn" className="btn-secondary" style={{ flex: '1' }}>Sign Up</button>
                </div>
                <button
                    id="reset-password-btn"
                    className="btn-secondary"
                    style={{ width: '100%', marginTop: '10px', fontSize: '0.9rem' }}
                >
                    Forgot Password?
                </button>
                <button id="cancel-email-auth-btn" className="btn-secondary" style={{ width: '100%', marginTop: '10px' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
