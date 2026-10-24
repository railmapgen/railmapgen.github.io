import '../../src/index.css';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../src/i18n/config';
import AppRoot from './components/app-root';

rmgRuntime.ready().then(() => {
    createRoot(document.getElementById('root') as HTMLDivElement).render(
        <StrictMode>
            <I18nextProvider i18n={i18n}>
                <AppRoot />
            </I18nextProvider>
        </StrictMode>
    );
    rmgRuntime.injectUITools();
});
