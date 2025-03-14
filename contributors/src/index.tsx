import '../../src/index.css';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { StrictMode } from 'react';
import AppRoot from './components/app-root';
import { createRoot, Root } from 'react-dom/client';
import i18n from '../../src/i18n/config';
import { I18nextProvider } from 'react-i18next';

let root: Root;

const renderApp = () => {
    root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <StrictMode>
            <I18nextProvider i18n={i18n}>
                <AppRoot />
            </I18nextProvider>
        </StrictMode>
    );
};

rmgRuntime.ready().then(() => {
    renderApp();
    rmgRuntime.injectUITools();
});
