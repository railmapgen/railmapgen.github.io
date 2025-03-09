import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { Button, Group, List, Modal, Stack, Text } from '@mantine/core';
import LanguageSelect from '../common/language-select';

interface CookiesModalProps {
    opened: boolean;
    onClose: () => void;
}

export default function CookiesModal(props: CookiesModalProps) {
    const { opened, onClose } = props;

    const { t } = useTranslation();

    const handleAccept = () => {
        rmgRuntime.allowAnalytics(true);
        onClose();
    };

    const handleReject = () => {
        const allowAnalyticsResponse = rmgRuntime.allowAnalytics(false);
        if (allowAnalyticsResponse.refreshRequired) {
            window.location.reload();
        } else {
            onClose();
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={() => {}}
            title={t('CookiesModal.header')}
            withCloseButton={false}
            closeOnEscape={false}
            closeOnClickOutside={false}
            centered
        >
            <Group>
                <LanguageSelect ml="auto" />
            </Group>

            <Stack gap="xs" py="xs">
                <Text>{t('CookiesModal.text1')}</Text>

                <Text mt={2}>{t('CookiesModal.text2')}</Text>

                <List withPadding>
                    <List.Item> {t('CookiesModal.item1')}</List.Item>
                </List>

                <Text mt={2}>{t('CookiesModal.text3')}</Text>
            </Stack>

            <Group gap="sm">
                <Button variant="default" ml="auto" onClick={handleReject}>
                    {t('CookiesModal.reject')}
                </Button>
                <Button onClick={handleAccept}>{t('CookiesModal.accept')}</Button>
            </Group>
        </Modal>
    );
}
