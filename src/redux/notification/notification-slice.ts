import rmgRuntime, { RMNotification } from '@railmapgen/rmg-runtime';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationState {
    notifications: RMNotification[];
}

const initialState: NotificationState = {
    notifications: [],
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<Omit<RMNotification, 'id' | 'source'>>) => {
            state.notifications.push({ ...action.payload, id: crypto.randomUUID(), source: rmgRuntime.getAppName() });
        },

        addRemoteNotification: (state, action: PayloadAction<RMNotification>) => {
            state.notifications.push(action.payload);
        },

        removeNotification: (state, action: PayloadAction<string>) => {
            const index = state.notifications.findIndex(n => n.id === action.payload);
            if (index > -1) {
                state.notifications.splice(index, 1);
            }
        },
    },
});

export const { addNotification, addRemoteNotification, removeNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
