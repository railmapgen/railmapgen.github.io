import store from '../index';
import appReducer, { addRemoteFont, AppState, closeApp, closeTab, openApp, openAppInNew } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    describe('AppSlice - open app', () => {
        let state: AppState = { ...realStore.app, openedTabs: [{ id: '01', app: 'rmg' }], activeTab: '01' };

        it('Can open and update active app', () => {
            state = appReducer(state, openApp({ appId: 'rmg-palette' }));

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
            state = appReducer(state, openApp({ appId: 'rmg' }));

            expect(state.openedTabs).toHaveLength(3);
            expect(state.activeTab).toBe(state.openedTabs[2].id);
        });

        it('Can switch active app', () => {
            state = appReducer(state, openApp({ appId: 'rmg-palette' }));

            expect(state.openedTabs).toHaveLength(3);
            expect(state.activeTab).toBe(state.openedTabs[1].id);
        });
    });

    describe('AppSlice - close app', () => {
        it('Can close current tab and set next active tab correctly', () => {
            const state: AppState = {
                ...realStore.app,
                openedTabs: [
                    { id: '01', app: 'rmg' },
                    { id: '02', app: 'rmg-palette' },
                    { id: '03', app: 'rmg' },
                ],
                activeTab: '01',
            };
            const nextState = appReducer(state, closeTab('01'));

            expect(nextState.openedTabs).toHaveLength(2);
            expect(nextState.activeTab).toBe('03');
        });

        it('Can close current app and set next active tab correctly', () => {
            const state: AppState = {
                ...realStore.app,
                openedTabs: [
                    { id: '01', app: 'rmg' },
                    { id: '02', app: 'rmg-palette' },
                    { id: '03', app: 'rmg' },
                ],
                activeTab: '02',
            };
            const nextState = appReducer(state, closeApp('rmg-palette'));

            expect(nextState.openedTabs).toHaveLength(2);
            expect(nextState.activeTab).toBe('01');
        });

        it('Can close other app and keep current active tab', () => {
            const state: AppState = {
                ...realStore.app,
                openedTabs: [
                    { id: '01', app: 'rmg' },
                    { id: '02', app: 'rmg-palette' },
                    { id: '03', app: 'rmg' },
                ],
                activeTab: '01',
            };
            const nextState = appReducer(state, closeApp('rmg-palette'));

            expect(nextState.openedTabs).toHaveLength(2);
            expect(nextState.activeTab).toBe('01');
        });
    });

    describe('AppSlice - fonts', () => {
        it('Can show font advice when new remote font loaded', () => {
            const state: AppState = {
                ...realStore.app,
                remoteFonts: {},
                showFontAdvice: 'hide',
            };
            const nextState = appReducer(state, addRemoteFont({ family: 'Arial', config: {} }));

            expect(nextState.remoteFonts).toHaveProperty('Arial');
            expect(nextState.showFontAdvice).toBe('show');
        });

        it('Do not show font advice when existing remote font loaded', () => {
            const state: AppState = {
                ...realStore.app,
                remoteFonts: { Arial: {} },
                showFontAdvice: 'hide',
            };
            const nextState = appReducer(state, addRemoteFont({ family: 'Arial', config: {} }));

            expect(Object.keys(nextState.remoteFonts)).toHaveLength(1);
            expect(nextState.remoteFonts).toHaveProperty('Arial');
            expect(nextState.showFontAdvice).toBe('hide');
        });

        it('Do not show font advice if user select do not show again', () => {
            const state: AppState = {
                ...realStore.app,
                remoteFonts: {},
                showFontAdvice: 'never',
            };
            const nextState = appReducer(state, addRemoteFont({ family: 'Arial', config: {} }));

            expect(nextState.remoteFonts).toHaveProperty('Arial');
            expect(nextState.showFontAdvice).toBe('never');
        });
    });
});
