import './index.css';
import { ChakraProvider } from '@chakra-ui/react';
import React, { StrictMode } from 'react';
import { Provider } from 'react-redux';
import AppRoot from './components/app-root';
import store from './redux';
import { createRoot, Root } from 'react-dom/client';
import { rmgChakraTheme } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { openApp } from './redux/app/app-slice';

let root: Root;

const renderApp = () => {
    root = createRoot(document.getElementById('root') as HTMLDivElement);
    root.render(
        <StrictMode>
            <Provider store={store}>
                <ChakraProvider theme={rmgChakraTheme}>
                    <AppRoot />
                </ChakraProvider>
            </Provider>
        </StrictMode>
    );
};

rmgRuntime.ready().then(() => {
    rmgRuntime.onAppOpen(app => store.dispatch(openApp(app)));
    renderApp();
});
