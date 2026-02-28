export function SidePanel() {
    return (
        <div id="side-panel" className="side-panel">
            <div className="panel-header">
                <h3 id="side-panel-title">Panel</h3>
                <div className="panel-controls" id="side-panel-controls">
                    {/* Controls injected dynamically */}
                </div>
            </div>
            <div id="side-panel-content" className="panel-content">
                {/* Content injected dynamically */}
            </div>
        </div>
    );
}
