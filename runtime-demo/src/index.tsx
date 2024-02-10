import '../../src/index.css';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { StrictMode } from 'react';
import AppRoot from './components/app-root';
import { createRoot, Root } from 'react-dom/client';

let root: Root;

const renderApp = () => {
    root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <StrictMode>
            <AppRoot />
        </StrictMode>
    );
};

rmgRuntime.ready().then(() => {
    renderApp();
    rmgRuntime.injectUITools();
});
