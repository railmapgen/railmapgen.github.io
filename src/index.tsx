import './index.css';
import { ChakraProvider } from '@chakra-ui/react';
import React, { StrictMode } from 'react';
import { Provider } from 'react-redux';
import AppRoot from './components/app-root';
import store from './redux';
import { createRoot, Root } from 'react-dom/client';
import { rmgChakraTheme } from '@railmapgen/rmg-components';

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

renderApp();
