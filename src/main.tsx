import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Import the main app module
import '../js/app';

const rootElement = document.getElementById('react-root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}
