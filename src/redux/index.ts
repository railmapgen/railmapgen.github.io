import { combineReducers, configureStore, createListenerMiddleware, TypedStartListening } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import accountReducer from './account/account-slice';
import appReducer from './app/app-slice';
import notificationReducer from './notification/notification-slice';
import rmpSaveReducer from './rmp-save/rmp-save-slice';

const rootReducer = combineReducers({
    app: appReducer,
    account: accountReducer,
    notification: notificationReducer,
    rmpSave: rmpSaveReducer,
});
export type RootState = ReturnType<typeof rootReducer>;

const listenerMiddleware = createListenerMiddleware();

export const createStore = (preloadedState: Partial<RootState> = {}) =>
    configureStore({
        reducer: rootReducer,
        middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listenerMiddleware.middleware),
        preloadedState,
    });
const store = createStore();

export type RootStore = typeof store;

export type RootDispatch = typeof store.dispatch;
export const useRootDispatch = () => useDispatch<RootDispatch>();
export const useRootSelector: TypedUseSelectorHook<RootState> = useSelector;

type RootStartListening = TypedStartListening<RootState, RootDispatch>;
export const startRootListening = listenerMiddleware.startListening as RootStartListening;

declare global {
    interface Window {
        rmgStore: RootStore;
    }
}
window.rmgStore = store;
export default store;
