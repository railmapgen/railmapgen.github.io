import store from '../index';
import appReducer, { bumpCounter } from './app-slice';

const realStore = store.getState();

describe('AppSlice', () => {
    it('Can bump counter as expected', () => {
        const nextState = appReducer(realStore.app, bumpCounter());
        expect(nextState.counter).toEqual(1);
    });
});
