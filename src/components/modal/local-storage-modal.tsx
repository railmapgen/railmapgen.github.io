import { useTranslation } from 'react-i18next';
import { Button, Group, Modal, Stack, Textarea } from '@mantine/core';

export default function LocalStorageModal(props: { opened: boolean; onClose: () => void }) {
    const { opened, onClose } = props;
    const { t } = useTranslation();
    const values = Object.entries(localStorage);

    return (
        <Modal opened={opened} onClose={onClose} size="xl" title={t('Local Storage')}>
            <Stack gap="xs">
                {values.map(v => (
                    <Textarea key={v[0]} label={v[0]} value={v[1]} ff="monospace" readOnly rows={4} />
                ))}
            </Stack>

            <Group pt="xs">
                <Button ml="auto" onClick={onClose}>
                    {t('Go back')}
                </Button>
            </Group>
        </Modal>
    );
}
