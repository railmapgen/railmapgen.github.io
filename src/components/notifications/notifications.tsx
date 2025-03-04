import classes from './notifications.module.css';
import { Portal, Stack } from '@mantine/core';
import SlidingNotification from './sliding-notification';

export default function Notifications() {
    return (
        <Portal>
            <Stack className={classes.root}>
                <SlidingNotification />
                <SlidingNotification />
            </Stack>
        </Portal>
    );
}
