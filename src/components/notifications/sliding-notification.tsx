import { DefaultMantineColor, Notification, Transition } from '@mantine/core';
import { useEffect, useState } from 'react';
import { removeNotification } from '../../redux/notification/notification-slice';
import { useRootDispatch } from '../../redux';
import { RMNotification } from '@railmapgen/rmg-runtime';

const NOTIFICATION_TYPE_COLOUR_MAPPING: Record<RMNotification['type'], DefaultMantineColor | undefined> = {
    info: undefined,
    success: 'green',
    warning: 'yellow',
    error: 'red',
};

const OPEN_DELAY_MS = 200;
const ANIMATION_DURATION_MS = 400;

type SlidingNotificationProps = {
    notification: RMNotification;
};

export default function SlidingNotification({ notification }: SlidingNotificationProps) {
    const dispatch = useRootDispatch();

    const [opened, setOpened] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            setOpened(true);
        }, OPEN_DELAY_MS);

        const closeTimeoutId = setTimeout(() => {
            setOpened(false);

            setTimeout(() => {
                dispatch(removeNotification(notification.id));
            }, ANIMATION_DURATION_MS);
        }, OPEN_DELAY_MS + notification.duration);

        return () => {
            clearTimeout(closeTimeoutId);
        };
    }, []);

    return (
        <Transition mounted={opened} transition="slide-left" duration={ANIMATION_DURATION_MS} timingFunction="ease">
            {style => (
                <Notification
                    color={NOTIFICATION_TYPE_COLOUR_MAPPING[notification.type]}
                    title={notification.title}
                    onClose={() => setOpened(false)}
                    withBorder
                    style={style}
                >
                    {notification.message}
                </Notification>
            )}
        </Transition>
    );
}
