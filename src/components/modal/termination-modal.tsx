import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

const emptyCallback = () => {
    // do nothing
};

export default function TerminationModal() {
    const { t } = useTranslation();

    return (
        <Modal isOpen={true} onClose={emptyCallback}>
            <ModalContent>
                <ModalHeader>{t('Rail Map Toolkit is opened in another window')}</ModalHeader>
                <ModalBody>{t('Current session has been terminated. Please close this window.')}</ModalBody>
            </ModalContent>
        </Modal>
    );
}
