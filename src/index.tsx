import './index.css';
import i18n from './i18n/config';
import React, { lazy, StrictMode } from 'react';
import { Provider } from 'react-redux';
import store from './redux';
import { createRoot, Root } from 'react-dom/client';
import { RmgErrorBoundary, RmgLoader, RmgThemeProvider } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { openApp, updateTabUrl } from './redux/app/app-slice';
import { AppId, Events, FRAME_ID_PREFIX, getAvailableApps } from './util/constants';
import initStore from './redux/init';
import { I18nextProvider } from 'react-i18next';

let root: Root;
const AppRoot = lazy(() => import('./components/app-root'));

const renderApp = () => {
    root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <StrictMode>
            <Provider store={store}>
                <I18nextProvider i18n={i18n}>
                    <RmgThemeProvider>
                        <RmgErrorBoundary suspenseFallback={<RmgLoader isIndeterminate={true} />} allowReset>
                            <AppRoot />
                        </RmgErrorBoundary>
                    </RmgThemeProvider>
                </I18nextProvider>
            </Provider>
        </StrictMode>
    );
};

rmgRuntime.ready().then(() => {
    initStore(store);
    renderApp();

    rmgRuntime.onAppOpen(app => {
        const availableApps = getAvailableApps(rmgRuntime.getEnv());
        if (typeof app === 'object') {
            if (app.appId in availableApps) {
                store.dispatch(openApp({ appId: app.appId as AppId, url: app.url }));
            }
        } else {
            if (availableApps.includes(app as any)) {
                store.dispatch(openApp({ appId: app as AppId }));
            }
        }
    });
    rmgRuntime.onUrlUpdate((url, frameId) => {
        if (frameId) {
            const id = frameId.slice(FRAME_ID_PREFIX.length);
            console.log(`Received URL update for frame=${id}, url=${url}`);
            store.dispatch(updateTabUrl({ id, url }));
        }
    });
    rmgRuntime.event(Events.APP_LOAD, { openedApps: store.getState().app.openedTabs.map(tab => tab.app) });
});
