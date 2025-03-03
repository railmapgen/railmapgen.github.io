import '@testing-library/jest-dom';
import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n/config';
import { Provider } from 'react-redux';
import { Store } from '@reduxjs/toolkit';
import { createStore } from './redux';
import { RMMantineProvider } from '@railmapgen/mantine-components';

export const createTestStore = createStore;

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    store: Store;
}

const initialOptions: CustomRenderOptions = {
    store: createTestStore(),
};

interface TestingProviderProps {
    children?: ReactNode;
    store: Store;
}

export const TestingProvider = (props: TestingProviderProps) => {
    const { children, store } = props;

    return (
        <I18nextProvider i18n={i18n}>
            <Provider store={store}>
                <RMMantineProvider>{children}</RMMantineProvider>
            </Provider>
        </I18nextProvider>
    );
};

const customRender = (ui: ReactElement, { store, ...renderOptions } = initialOptions) => {
    return render(ui, {
        wrapper: props => <TestingProvider store={store} {...props} />,
        ...renderOptions,
    });
};

export { customRender as render };
