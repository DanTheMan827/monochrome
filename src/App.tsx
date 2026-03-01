import React, { useEffect } from 'react';
import { AppShell } from './components/AppShell';

const App: React.FC = () => {
    useEffect(() => {
        import('../js/app').then(({ initApp }) => {
            initApp();
        });
    }, []);

    return <AppShell />;
};

export default App;
