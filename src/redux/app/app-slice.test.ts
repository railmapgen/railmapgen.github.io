import store from '../index';
import appReducer, { AppState, closeTab, openApp } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    describe('AppSlice - open and close app', () => {
        let state: AppState = { ...realStore.app, openedTabs: [{ id: '01', app: 'rmg' }], activeTab: '01' };

        it('Can open and update active app', () => {
            state = appReducer(state, openApp('rmg-palette'));

            expect(state.openedTabs).toHaveLength(2);
            expect(state.openedTabs).toContainEqual(expect.objectContaining({ app: 'rmg-palette' }));
            const tabId = state.openedTabs.find(tab => tab.app === 'rmg-palette')?.id;
            expect(state.activeTab).toBe(tabId);
        });

        it('Can switch active app', () => {
            state = appReducer(state, openApp('rmg'));

            // tab order remains the same
            expect(state.openedTabs).toHaveLength(2);
            expect(state.openedTabs[0]).toHaveProperty('app', 'rmg');
            expect(state.openedTabs[1]).toHaveProperty('app', 'rmg-palette');

            expect(state.activeTab).toBe('01');
        });

        it('Can close app and make the other app active', () => {
            state = appReducer(state, closeTab('01'));

            expect(state.openedTabs).toHaveLength(1);
            expect(state.openedTabs[0]).toHaveProperty('app', 'rmg-palette');

            const tabId = state.openedTabs.find(tab => tab.app === 'rmg-palette')?.id;
            expect(state.activeTab).toBe(tabId);
        });
    });
});
