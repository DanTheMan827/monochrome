export function FolderPage() {
  return (
    <section id="page-folder" className="page">
      <header className="detail-header">
        <img
          id="folder-detail-image"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
          className="detail-header-image"
          alt="Folder Cover"
        />
        <div className="detail-header-info">
          <h1 className="title" id="folder-detail-title"></h1>
          <div className="meta" id="folder-detail-meta"></div>
          <div className="detail-header-actions">
            <button id="delete-folder-btn" className="btn-secondary danger">Delete Folder</button>
          </div>
        </div>
      </header>
      <div className="card-grid" id="folder-detail-container"></div>
    </section>
  );
}
