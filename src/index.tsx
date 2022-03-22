import { ChakraProvider } from '@chakra-ui/react';
import React, { StrictMode } from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import AppRoot from './components/app-root';
import chakraTheme from './theme/theme';
import store from './redux';

const renderApp = () => {
    ReactDOM.render(
        <Provider store={store}>
            <ChakraProvider theme={chakraTheme}>
                <StrictMode>
                    <AppRoot />
                </StrictMode>
            </ChakraProvider>
        </Provider>,
        document.getElementById('root')
    );
};

renderApp();
