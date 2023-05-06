import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

const emptyCallback = () => {
    // do nothing
};

export default function MultiInstanceModal() {
    const { t } = useTranslation();

    return (
        <Modal isOpen={true} onClose={emptyCallback}>
            <ModalContent>
                <ModalHeader>{t('Rail Map Toolkit is opened in another window')}</ModalHeader>
                <ModalBody>
                    {t('You cannot open multiple Rail Map Toolkit at the same time. Please close this window.')}
                </ModalBody>

                <ModalFooter>
                    {/*<Button onClick={() => window.close()}>{t('Close current tab')}</Button>*/}
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
