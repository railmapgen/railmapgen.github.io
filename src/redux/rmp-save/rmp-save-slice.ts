import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface RMPSaveState {
    baseUserId?: number;
    baseSaveId?: number;
    baseHash?: string;
    resolveConflictModal: {
        isOpen: boolean;
        saveId?: number;
        cloudData: string;
        cloudHash?: string;
    };
}

const initialState: RMPSaveState = {
    baseUserId: undefined,
    baseSaveId: undefined,
    baseHash: undefined,
    resolveConflictModal: {
        isOpen: false,
        saveId: undefined,
        cloudData: '',
        cloudHash: undefined,
    },
};

const rmpSaveSlice = createSlice({
    name: 'save',
    initialState,
    reducers: {
        setBaseSync: (state, action: PayloadAction<{ userId: number; saveId: number; hash: string }>) => {
            state.baseUserId = action.payload.userId;
            state.baseSaveId = action.payload.saveId;
            state.baseHash = action.payload.hash;
        },
        clearBaseSync: state => {
            state.baseUserId = undefined;
            state.baseSaveId = undefined;
            state.baseHash = undefined;
        },
        setResolveConflictModal: (
            state,
            action: PayloadAction<{ saveId: number; cloudData: string; cloudHash: string }>
        ) => {
            state.resolveConflictModal = {
                isOpen: true,
                saveId: action.payload.saveId,
                cloudData: action.payload.cloudData,
                cloudHash: action.payload.cloudHash,
            };
        },
        clearResolveConflictModal: state => {
            state.resolveConflictModal = {
                isOpen: false,
                saveId: undefined,
                cloudData: '',
                cloudHash: undefined,
            };
        },
    },
});

export const { setBaseSync, clearBaseSync, setResolveConflictModal, clearResolveConflictModal } = rmpSaveSlice.actions;
export default rmpSaveSlice.reducer;
