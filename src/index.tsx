import './index.css';
import './inject-seo';
import i18n from './i18n/config';
import React, { lazy, StrictMode } from 'react';
import { Provider } from 'react-redux';
import store from './redux';
import { createRoot, Root } from 'react-dom/client';
import { RmgErrorBoundary, RmgLoader, RmgThemeProvider } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { closeApp, openApp, updateTabUrl } from './redux/app/app-slice';
import { Events, FRAME_ID_PREFIX } from './util/constants';
import initStore from './redux/init';
import { I18nextProvider } from 'react-i18next';
import { getAllowedAssetTypes, getAvailableAsset } from './util/asset-enablements';

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
        const allowedAssetTypes = getAllowedAssetTypes(store.getState().app.isShowDevtools);
        const availableApps = allowedAssetTypes
            .map(type => getAvailableAsset(type, rmgRuntime.getEnv(), rmgRuntime.getInstance()))
            .flat();
        if (typeof app === 'object') {
            if (availableApps.includes(app.appId)) {
                store.dispatch(openApp({ appId: app.appId, url: app.url }));
            }
        } else {
            if (availableApps.includes(app)) {
                store.dispatch(openApp({ appId: app }));
            }
        }
    });

    rmgRuntime.onAppClose(app => {
        store.dispatch(closeApp(app));
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
