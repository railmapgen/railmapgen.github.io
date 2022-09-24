import { configureStore, createListenerMiddleware, TypedStartListening } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import appReducer from './app/app-slice';

const listenerMiddleware = createListenerMiddleware();

const store = configureStore({
    reducer: {
        app: appReducer,
    },
    middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

export type RootDispatch = typeof store.dispatch;
export const useRootDispatch = () => useDispatch<RootDispatch>();
export const useRootSelector: TypedUseSelectorHook<RootState> = useSelector;

type RootStartListening = TypedStartListening<RootState, RootDispatch>;
export const startRootListening = listenerMiddleware.startListening as RootStartListening;

(window as any).rmgStore = store;
export default store;
