import './index.css';
import './inject-seo';
import i18n from './i18n/config';
import { lazy, StrictMode } from 'react';
import { Provider } from 'react-redux';
import store from './redux';
import { createRoot, Root } from 'react-dom/client';
import { RmgErrorBoundary, RmgLoader, RmgThemeProvider } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import {
    addRemoteFont,
    closeApp,
    isShowDevtools,
    openApp,
    updateTabMetadata,
    updateTabUrl,
} from './redux/app/app-slice';
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
        const allowedAssetTypes = getAllowedAssetTypes(isShowDevtools(store.getState().app.lastShowDevtools));
        const availableApps = allowedAssetTypes
            .map(type => getAvailableAsset(type, rmgRuntime.getEnv(), rmgRuntime.getInstance()))
            .flat();
        if (availableApps.includes(app.appId)) {
            store.dispatch(openApp(app));
        }
    });

    rmgRuntime.onAppClose(app => {
        store.dispatch(closeApp(app));
    });

    rmgRuntime.onAppMetadataUpdate((metadata, frameId) => {
        if (frameId) {
            const id = frameId.slice(FRAME_ID_PREFIX.length);
            console.log(`[rmt] Received metadata update for frame=${id}, metadata is`, metadata);
            store.dispatch(updateTabMetadata({ ...metadata, id }));
        }
    });

    rmgRuntime.onUrlUpdate((url, frameId) => {
        if (frameId) {
            const id = frameId.slice(FRAME_ID_PREFIX.length);
            console.log(`[rmt] Received URL update for frame=${id}, url=${url}`);
            store.dispatch(updateTabUrl({ id, url }));
        }
    });

    rmgRuntime.onRemoteFontLoaded(({ family, definition: { displayName, url } }) => {
        store.dispatch(addRemoteFont({ family, config: { displayName, url } }));
    });

    rmgRuntime.event(Events.APP_LOAD, { openedApps: store.getState().app.openedTabs.map(tab => tab.app) });
});
