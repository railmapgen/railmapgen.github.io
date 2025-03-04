import {
    Box,
    Button,
    Flex,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    Textarea,
    VStack,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { MdDeleteOutline } from 'react-icons/md';

export default function LocalStorageModal(props: { isOpen: boolean; onClose: () => void }) {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();
    const values = Object.entries(localStorage);

    const handleClearKey = (key: string) => {
        localStorage.removeItem(key);
        window.location.reload();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Local Storage')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack p={1}>
                        {values.map(v => (
                            <Box key={v[0]} width="100%">
                                <Flex>
                                    <Text>{v[0]}</Text>
                                    <Flex style={{ flex: 1 }} />
                                    <IconButton
                                        icon={<MdDeleteOutline />}
                                        variant="ghost"
                                        aria-label="Clear"
                                        size="xs"
                                        onClick={() => handleClearKey(v[0])}
                                    />
                                </Flex>
                                <Textarea value={v[1]} readOnly fontFamily="monospace" fontSize="xs" />
                            </Box>
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
