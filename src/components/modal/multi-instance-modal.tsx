import { useTranslation } from 'react-i18next';
import { restartRMT } from '../../util/instance-checker';
import { useState } from 'react';
import { Button, Group, Modal, Text } from '@mantine/core';

const emptyCallback = () => {
    // do nothing
};

export default function MultiInstanceModal() {
    const { t } = useTranslation();

    const [isLoading, setIsLoading] = useState(false);

    const handleRestart = () => {
        setIsLoading(true);
        restartRMT();
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    };

    return (
        <Modal
            opened={true}
            onClose={emptyCallback}
            title={t('Rail Map Toolkit is opened in another window')}
            withCloseButton={false}
            closeOnEscape={false}
            closeOnClickOutside={false}
            centered
        >
            <Text>{t('You cannot open multiple Rail Map Toolkit at the same time. Please close this window.')}</Text>
            <Group mt="xs">
                <Button variant="default" onClick={handleRestart} loading={isLoading} disabled={isLoading}>
                    {t('Restart RMT in this window')}
                </Button>
            </Group>
        </Modal>
    );
}
