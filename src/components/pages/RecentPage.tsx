import TrashIcon from '../../assets/icons/trash.svg?react';

export function RecentPage() {
  return (
    <div id="page-recent" className="page">
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}
      >
        <h2 className="section-title" style={{ marginBottom: '0' }}>Recently played</h2>
        <button className="btn-secondary" id="clear-history-btn" title="Clear History">
          <TrashIcon width={16} height={16} />
          <span>Clear</span>
        </button>
      </div>
      <div className="track-list" id="recent-tracks-container"></div>
    </div>
  );
}
