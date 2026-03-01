export function CsvImportProgress() {
    return (
        <div id="csv-import-progress" className="csv-import-progress" style={{ display: 'none' }}>
            <div className="progress-header">
                <h4>Importing Tracks from CSV</h4>
                <p className="progress-warning">
                    This can take a while depending on your playlist size. Please be patient.
                </p>
            </div>
            <div className="progress-content">
                <div className="current-track">Preparing import...</div>
                <div
                    className="current-artist"
                    style={{ fontSize: '0.9em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}
                ></div>
                <div className="progress-bar">
                    <div className="progress-fill" id="csv-progress-fill"></div>
                </div>
                <div className="progress-text">
                    <span id="csv-progress-current">0</span> / <span id="csv-progress-total">0</span> tracks processed
                </div>
            </div>
        </div>
    );
}
