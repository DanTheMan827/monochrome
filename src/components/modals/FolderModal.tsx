import { useModalStore } from '../../store/modalStore';

export function FolderModal() {
    const { isOpen } = useModalStore();
    return (
        <div id="folder-modal" className={`modal ${isOpen('folder') ? 'active' : ''}`}>
            <div className="modal-overlay"></div>
            <div className="modal-content">
                <h3 id="folder-modal-title">Create Folder</h3>
                <input
                    type="text"
                    id="folder-name-input"
                    className="template-input"
                    placeholder="Folder name"
                    style={{ margin: '1rem 0' }}
                />
                <input
                    type="url"
                    id="folder-cover-input"
                    className="template-input"
                    placeholder="Icon URL (optional)"
                    style={{ margin: '0.5rem 0' }}
                />
                <div className="modal-actions">
                    <button id="folder-modal-cancel" className="btn-secondary">Cancel</button>
                    <button id="folder-modal-save" className="btn-primary">Save</button>
                </div>
            </div>
        </div>
    );
}
