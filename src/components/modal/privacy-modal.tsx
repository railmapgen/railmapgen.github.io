import { useTranslation } from 'react-i18next';
import {
    Alert,
    AlertIcon,
    Box,
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useEffect, useState } from 'react';

interface PrivacyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function PrivacyModal(props: PrivacyModalProps) {
    const { isOpen, onClose } = props;

    const { t } = useTranslation();

    const [allowCookies, setAllowCookies] = useState(rmgRuntime.isAllowAnalytics());
    const [alertMsg, setAlertMsg] = useState<string>();

    useEffect(() => {
        if (!isOpen) {
            setAlertMsg(undefined);
        }
    }, [isOpen]);

    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('Allow cookies to help improve our website'),
            isChecked: allowCookies,
            onChange: setAllowCookies,
            oneLine: true,
        },
    ];

    const handleSave = () => {
        const allowAnalyticsResponse = rmgRuntime.allowAnalytics(allowCookies);
        if (allowAnalyticsResponse.refreshRequired) {
            setAlertMsg('Refreshing is required for changes to take effect.');
            // do not close modal automatically
        } else {
            onClose();
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                {alertMsg && (
                    <Alert status="info" variant="solid" size="xs">
                        <AlertIcon />
                        {t(alertMsg)}
                    </Alert>
                )}
                <Box position="relative">
                    <ModalHeader>{t('Privacy settings')}</ModalHeader>
                    <ModalCloseButton />
                </Box>

                <ModalBody>
                    <RmgFields fields={fields} />
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="primary" isDisabled={!!alertMsg} onClick={handleSave}>
                        {t('Save')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
