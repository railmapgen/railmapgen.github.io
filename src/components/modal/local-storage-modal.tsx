import { useTranslation } from 'react-i18next';
import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { RmgLabel } from '@railmapgen/rmg-components';

export default function LocalStorageModal(props: { isOpen: boolean; onClose: () => void }) {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();
    const values = Object.entries(localStorage);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Local Storage')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack p={1}>
                        {values.map(v => (
                            <RmgLabel key={v[0]} label={v[0]} minW="full">
                                <Textarea value={v[1]} readOnly fontFamily="monospace" fontSize="xs" />
                            </RmgLabel>
                        ))}
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button onClick={onClose}>{t('Go back')}</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
