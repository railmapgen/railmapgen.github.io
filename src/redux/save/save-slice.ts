import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SaveState {
    lastChangedAt: Date;
    resolveConflictModal: {
        isOpen: boolean;
        lastChangedAt: Date;
        lastUpdatedAt: Date;
        cloudData: string;
    };
}

const initialState: SaveState = {
    lastChangedAt: new Date(0),
    resolveConflictModal: {
        isOpen: false,
        lastChangedAt: new Date(0),
        lastUpdatedAt: new Date(0),
        cloudData: '',
    },
};

const saveSlice = createSlice({
    name: 'save',
    initialState,
    reducers: {
        setLastChangedAt: (state, action: PayloadAction<Date | undefined>) => {
            state.lastChangedAt = action.payload ?? new Date();
        },
        setResolveConflictModal: (
            state,
            action: PayloadAction<{ lastChangedAt: Date; lastUpdatedAt: Date; cloudData: string }>
        ) => {
            state.resolveConflictModal = {
                isOpen: true,
                lastChangedAt: action.payload.lastChangedAt,
                lastUpdatedAt: action.payload.lastUpdatedAt,
                cloudData: action.payload.cloudData,
            };
        },
        clearResolveConflictModal: state => {
            state.resolveConflictModal = {
                isOpen: false,
                lastChangedAt: new Date(0),
                lastUpdatedAt: new Date(0),
                cloudData: '',
            };
        },
    },
});

export const { setLastChangedAt, setResolveConflictModal, clearResolveConflictModal } = saveSlice.actions;
export default saveSlice.reducer;
