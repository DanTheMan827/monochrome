export function CustomDbModal() {
    return (
        <div id="custom-db-modal" className="modal">
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0' }}>Custom Database/Auth</h3>
                    <button
                        id="custom-db-reset"
                        className="btn-secondary danger"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    >
                        Reset to Defaults
                    </button>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
                    Configure custom PocketBase and Firebase instances. Leave empty to use defaults.
                    <br />
                    A Guide To Set This Up Can Be Found{' '}
                    <a
                        href="https://github.com/monochrome-music/monochrome/blob/main/self-hosted-database.md"
                        style={{ textDecoration: 'underline' }}
                    >
                        Here
                    </a>
                    .
                </p>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>PocketBase URL</label>
                    <input
                        type="url"
                        id="custom-pb-url"
                        className="template-input"
                        placeholder="https://monodb.samidy.com"
                    />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        Firebase Configuration (JSON)
                    </label>
                    <textarea
                        id="custom-firebase-config"
                        className="template-input"
                        style={{ height: '150px', fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
                        placeholder='{"apiKey": "...", ...}'
                    ></textarea>
                </div>
                <div className="modal-actions">
                    <button id="custom-db-cancel" className="btn-secondary">Cancel</button>
                    <button id="custom-db-save" className="btn-primary">Save & Reload</button>
                </div>
            </div>
        </div>
    );
}
