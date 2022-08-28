import store from '../index';
import appReducer, { AppState, closeApp, openApp } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    describe('AppSlice - open and close app', () => {
        let state: AppState = { ...realStore.app, openedApps: ['rmg'], activeApp: 'rmg' };

        it('Can open and update active app', () => {
            state = appReducer(state, openApp('rmg-palette'));

            expect(state.openedApps).toEqual(['rmg', 'rmg-palette']);
            expect(state.activeApp).toBe('rmg-palette');
        });

        it('Can switch active app', () => {
            state = appReducer(state, openApp('rmg'));

            // tab order remains the same
            expect(state.openedApps).toEqual(['rmg', 'rmg-palette']);
            expect(state.activeApp).toBe('rmg');
        });

        it('Can close app and make the other app active', () => {
            state = appReducer(state, closeApp('rmg'));

            expect(state.openedApps).toEqual(['rmg-palette']);
            expect(state.activeApp).toBe('rmg-palette');
        });
    });
});
