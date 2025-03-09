import rmgRuntime, { logger } from '@railmapgen/rmg-runtime';
import { lazy, StrictMode } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { Provider } from 'react-redux';
import i18n from './i18n/config';
import './index.css';
import './inject-seo';
import store from './redux';
import { syncAfterLogin } from './redux/account/account-slice';
import { addRemoteFont, closeApp, isShowDevtools, openApp, updateTabMetadata } from './redux/app/app-slice';
import initStore from './redux/init';
import { checkTokenAndRefreshStore } from './util/api';
import { getAllowedAssetTypes, getAvailableAsset } from './util/asset-enablements';
import { Events, FRAME_ID_PREFIX } from './util/constants';
import { registerOnRMPSaveChange } from './util/local-storage-save';
import { RMErrorBoundary, RMMantineProvider } from '@railmapgen/mantine-components';
import { LoadingOverlay } from '@mantine/core';

let root: Root;
const AppRoot = lazy(() => import('./components/app-root'));

const renderApp = () => {
    root = createRoot(document.getElementById('root') as HTMLDivElement);

    root.render(
        <StrictMode>
            <Provider store={store}>
                <I18nextProvider i18n={i18n}>
                    <RMMantineProvider>
                        <RMErrorBoundary suspenseFallback={<LoadingOverlay visible />} allowReset>
                            <AppRoot />
                        </RMErrorBoundary>
                    </RMMantineProvider>
                </I18nextProvider>
            </Provider>
        </StrictMode>
    );
};

rmgRuntime.ready().then(async () => {
    initStore(store);

    // If user is logged in previously, fetch and sync the save (resolve conflicts might be needed).
    // Otherwise this is a no-op.
    await checkTokenAndRefreshStore(store);
    await store.dispatch(syncAfterLogin());

    renderApp();

    // FIXME: Broadcast current theme to chakra UI apps. Do not remove until all apps are migrated.
    const colourMode = rmgRuntime.getColourMode();
    if (colourMode === 'system') {
        if (window.matchMedia?.('(prefers-color-scheme: dark)')?.matches) {
            window.localStorage.setItem('chakra-ui-color-mode', 'dark');
        } else {
            window.localStorage.setItem('chakra-ui-color-mode', 'light');
        }
    } else {
        window.localStorage.setItem('chakra-ui-color-mode', colourMode);
    }

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
            logger.info(`Received metadata update for frame=${id}, metadata is`, metadata);
            store.dispatch(updateTabMetadata({ ...metadata, id }));
        }
    });

    rmgRuntime.onRemoteFontLoaded(({ family, definition: { displayName, url } }) => {
        store.dispatch(addRemoteFont({ family, config: { displayName, url } }));
    });

    rmgRuntime.event(Events.APP_LOAD, { openedApps: store.getState().app.openedTabs.map(tab => tab.app) });

    registerOnRMPSaveChange(store);
});
