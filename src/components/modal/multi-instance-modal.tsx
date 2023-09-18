import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { restartRMT } from '../../util/instance-checker';
import { useState } from 'react';

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
        <Modal isOpen={true} onClose={emptyCallback}>
            <ModalContent>
                <ModalHeader>{t('Rail Map Toolkit is opened in another window')}</ModalHeader>
                <ModalBody>
                    {t('You cannot open multiple Rail Map Toolkit at the same time. Please close this window.')}
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="primary" onClick={handleRestart} isLoading={isLoading}>
                        {t('Restart RMT in this window')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
