import classes from './notifications.module.css';
import { Portal, Stack } from '@mantine/core';
import SlidingNotification from './sliding-notification';
import { useRootSelector } from '../../redux';

export default function Notifications() {
    const { notifications } = useRootSelector(state => state.notification);

    return (
        <Portal>
            <Stack className={classes.root}>
                {notifications.map(notification => (
                    <SlidingNotification key={notification.id} notification={notification} />
                ))}
            </Stack>
        </Portal>
    );
}
