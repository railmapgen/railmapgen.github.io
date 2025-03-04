import { Notification, Transition } from '@mantine/core';
import { useEffect, useState } from 'react';

export default function SlidingNotification() {
    const [opened, setOpened] = useState(false);

    useEffect(() => {
        setTimeout(() => {
            setOpened(true);
        }, 200);

        const timeoutId = setTimeout(() => {
            setOpened(false);
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, []);

    return (
        <Transition mounted={opened} transition="slide-left" duration={400} timingFunction="ease">
            {style => (
                <Notification title="We notify you that" onClose={() => setOpened(false)} style={style}>
                    You are now obligated to give a star to Mantine project on GitHub
                </Notification>
            )}
        </Transition>
    );
}
