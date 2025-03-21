import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import rmgRuntime from '@railmapgen/rmg-runtime';

export type RMNotificationType = 'info' | 'success' | 'warning' | 'error';

export type RMNotification = {
    id: string;
    title: string;
    message: string;
    type: RMNotificationType;
    duration: number;
    source: string;
};

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

        removeNotification: (state, action: PayloadAction<string>) => {
            const index = state.notifications.findIndex(n => n.id === action.payload);
            if (index > -1) {
                state.notifications.splice(index, 1);
            }
        },
    },
});

export const { addNotification, removeNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
