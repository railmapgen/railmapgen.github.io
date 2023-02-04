import store from '../index';
import appReducer, { AppState, closeTab, openApp, openAppInNew, toggleMenu } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    describe('AppSlice - open and close app', () => {
        let state: AppState = { ...realStore.app, openedTabs: [{ id: '01', app: 'rmg' }], activeTab: '01' };

        it('Can open and update active app', () => {
            state = appReducer(state, openApp('rmg-palette'));

            expect(state.openedTabs).toHaveLength(2);
            expect(state.openedTabs[0]).toHaveProperty('app', 'rmg');
            expect(state.openedTabs[1]).toHaveProperty('app', 'rmg-palette');

            expect(state.activeTab).toBe(state.openedTabs[1].id);
        });

        it('Can open multi-instance app in new app', () => {
            state = appReducer(state, openAppInNew('rmg'));

            expect(state.openedTabs).toHaveLength(3);
            expect(state.openedTabs[0]).toHaveProperty('app', 'rmg');
            expect(state.openedTabs[2]).toHaveProperty('app', 'rmg');

            expect(state.activeTab).toBe(state.openedTabs[2].id);
        });

        it('Do not switch active app if it is active', () => {
            state = appReducer(state, openApp('rmg'));

            expect(state.openedTabs).toHaveLength(3);
            expect(state.activeTab).toBe(state.openedTabs[2].id);
        });

        it('Can switch active app', () => {
            state = appReducer(state, openApp('rmg-palette'));

            expect(state.openedTabs).toHaveLength(3);
            expect(state.activeTab).toBe(state.openedTabs[1].id);
        });

        it('Can close app and make the other app active', () => {
            state = appReducer(state, closeTab(state.openedTabs[1].id));

            expect(state.openedTabs).toHaveLength(2);
            expect(state.openedTabs[0]).toHaveProperty('app', 'rmg');
            expect(state.openedTabs[1]).toHaveProperty('app', 'rmg');

            expect(state.activeTab).toBe(state.openedTabs[1].id);
        });

        it('Can close all apps and show app menu', () => {
            // hide menu
            state = appReducer(state, toggleMenu());
            expect(state.isShowMenu).toBeFalsy();

            while (state.openedTabs.length) {
                state = appReducer(state, closeTab(state.openedTabs[0].id));
            }
            expect(state.isShowMenu).toBeTruthy();
            expect(state.openedTabs).toHaveLength(0);
            expect(state.activeTab).toBeUndefined();
        });
    });
});
