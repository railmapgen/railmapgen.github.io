import rmgRuntime from '@railmapgen/rmg-runtime';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Button, Group, Title } from '@mantine/core';

export default function NotificationsDemo() {
    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    Notifications
                </Title>
            </RMSectionHeader>
            <Group>
                <Button
                    color="green"
                    onClick={() =>
                        rmgRuntime.sendNotification({
                            title: 'Success',
                            message: `You've submitted your personal info successfully.`,
                            type: 'success',
                            duration: 5000,
                        })
                    }
                >
                    Send success
                </Button>
                <Button
                    color="yellow"
                    onClick={() =>
                        rmgRuntime.sendNotification({
                            title: 'Security warning',
                            message: `Your device is hacked!`,
                            type: 'warning',
                            duration: 5000,
                        })
                    }
                >
                    Send warning
                </Button>
                <Button
                    color="red"
                    onClick={() =>
                        rmgRuntime.sendNotification({
                            title: 'Error',
                            message: `A fatal error occurred.`,
                            type: 'error',
                            duration: 5000,
                        })
                    }
                >
                    Send error
                </Button>
                <Button
                    onClick={() =>
                        rmgRuntime.sendNotification({
                            title: 'Greeting',
                            message: `Have a nice day!`,
                            type: 'info',
                            duration: 5000,
                        })
                    }
                >
                    Send info
                </Button>
            </Group>
        </RMSection>
    );
}
