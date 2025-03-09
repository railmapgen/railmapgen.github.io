import classes from './local-storage-modal.module.css';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Button, Code, Group, Modal, Stack, Text, Textarea } from '@mantine/core';
import { MdOutlineDeleteOutline } from 'react-icons/md';
import { useState } from 'react';
import { assetEnablement } from '../../util/asset-enablements';

export default function LocalStorageModal(props: { opened: boolean; onClose: () => void }) {
    const { opened, onClose } = props;
    const { t } = useTranslation();

    const [selectedItem, setSelectedItem] = useState<string>();

    const values = Object.entries(localStorage);

    const handleRemove = () => {
        if (selectedItem) {
            window.localStorage.removeItem(selectedItem);
            window.location.reload();
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} size="xl" title={t('Local Storage')}>
            <Stack gap="xs">
                {values.map(v => (
                    <Textarea
                        key={v[0]}
                        label={
                            <Group align="center" gap="xs">
                                {v[0]}
                                <ActionIcon
                                    variant="default"
                                    size="xs"
                                    title={t('Remove this item')}
                                    aria-label={t('Remove this item')}
                                    onClick={() => setSelectedItem(v[0])}
                                >
                                    <MdOutlineDeleteOutline />
                                </ActionIcon>
                            </Group>
                        }
                        value={v[1]}
                        readOnly
                        rows={4}
                        classNames={{ label: classes['textarea-label'], input: classes['textarea-input'] }}
                    />
                ))}
            </Stack>

            <Group pt="xs">
                <Button ml="auto" onClick={onClose}>
                    {t('Go back')}
                </Button>
            </Group>

            {selectedItem && (
                <Modal opened={true} onClose={() => setSelectedItem(undefined)} centered title={t('Warning')}>
                    <Text>
                        {t('LocalStorageModal.text1')}
                        <Code>{selectedItem}</Code>
                        {t('LocalStorageModal.text2')}
                        <Text span fw={500}>
                            {t(assetEnablement[selectedItem.split('__')[0]]?.name ?? 'Unknown app')}
                        </Text>
                        {t('LocalStorageModal.text3')}
                        <br />
                        {t('LocalStorageModal.text4')}
                    </Text>
                    <Group gap="xs" mt="xs">
                        <Button variant="default" ml="auto" onClick={() => setSelectedItem(undefined)}>
                            {t('Back')}
                        </Button>
                        <Button color="red" onClick={handleRemove}>
                            {t('Delete and reload')}
                        </Button>
                    </Group>
                </Modal>
            )}
        </Modal>
    );
}
