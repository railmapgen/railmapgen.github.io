import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RMPSaveState {
    /**
     * The last time the user made a change to the save.
     * Will be compared with the lastUpdateAt from the cloud to determine if there is a conflict on login.
     * Will be set to now on every save.
     */
    lastChangedAtTimeStamp: number;
    resolveConflictModal: {
        isOpen: boolean;
        lastChangedAtTimeStamp: number;
        lastUpdatedAtTimeStamp: number;
        cloudData: string;
    };
}

const initialState: RMPSaveState = {
    lastChangedAtTimeStamp: 0,
    resolveConflictModal: {
        isOpen: false,
        lastChangedAtTimeStamp: 0,
        lastUpdatedAtTimeStamp: 0,
        cloudData: '',
    },
};

const rmpSaveSlice = createSlice({
    name: 'save',
    initialState,
    reducers: {
        setLastChangedAtTimeStamp: (state, action: PayloadAction<number>) => {
            state.lastChangedAtTimeStamp = action.payload;
        },
        setResolveConflictModal: (
            state,
            action: PayloadAction<{ lastChangedAtTimeStamp: number; lastUpdatedAtTimeStamp: number; cloudData: string }>
        ) => {
            state.resolveConflictModal = {
                isOpen: true,
                lastChangedAtTimeStamp: action.payload.lastChangedAtTimeStamp,
                lastUpdatedAtTimeStamp: action.payload.lastUpdatedAtTimeStamp,
                cloudData: action.payload.cloudData,
            };
        },
        clearResolveConflictModal: state => {
            state.resolveConflictModal = {
                isOpen: false,
                lastChangedAtTimeStamp: 0,
                lastUpdatedAtTimeStamp: 0,
                cloudData: '',
            };
        },
    },
});

export const { setLastChangedAtTimeStamp, setResolveConflictModal, clearResolveConflictModal } = rmpSaveSlice.actions;
export default rmpSaveSlice.reducer;
