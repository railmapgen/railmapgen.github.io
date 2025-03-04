import { useTranslation } from 'react-i18next';
import { Modal, Text } from '@mantine/core';

const emptyCallback = () => {
    // do nothing
};

export default function TerminationModal() {
    const { t } = useTranslation();

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
            <Text>{t('Current session has been terminated. Please close this window.')}</Text>
        </Modal>
    );
}
