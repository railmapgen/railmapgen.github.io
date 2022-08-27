import { createSlice } from '@reduxjs/toolkit';

interface AppState {
    counter: number;
}

const initialState: AppState = {
    counter: 0,
};

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        bumpCounter: state => {
            state.counter++;
        },
    },
});

export const { bumpCounter } = appSlice.actions;
export default appSlice.reducer;
