import {
    Button,
    Icon,
    Input,
    Link,
    ListItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Text,
    UnorderedList,
    useColorModeValue,
    useToast,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { logout } from '../../redux/account/account-slice';
import { apiFetch } from '../../util/api';
import { API_ENDPOINT } from '../../util/constants';

const RedeemModal = (props: { isOpen: boolean; onClose: () => void; getSubscriptions: () => Promise<void> }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const { isOpen, onClose, getSubscriptions } = props;
    const { isLoggedIn, token } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const linkColour = useColorModeValue('primary.500', 'primary.300');
    const [CDKey, setCDKey] = React.useState('');

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const handleRedeem = async (CDKey: string) => {
        if (!isLoggedIn) return;
        const rep = await apiFetch(
            API_ENDPOINT.SUBSCRIPTION_REDEEM,
            { method: 'POST', body: JSON.stringify({ cdkey: CDKey.trim() }) },
            token
        );
        if (!rep) {
            showErrorToast(t('Login status expired'));
            dispatch(logout());
            return;
        }
        if (rep.status !== 202) {
            const msg = (await rep.json()).message;
            toast({
                title: t(msg),
                status: 'error' as const,
                duration: 5000,
                isClosable: true,
            });
            return;
        }
        await getSubscriptions();
        // TODO: let RMP refresh its subscription status
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Redeem your subscription')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text>{t('CDKey could be purchased in the following sites:')}</Text>
                    <UnorderedList>
                        <ListItem>
                            <Link
                                color={linkColour}
                                href="https://afdian.com/item/9c8b220c614311efab2d52540025c377"
                                isExternal={true}
                            >
                                爱发电 <Icon as={MdOpenInNew} />
                            </Link>
                        </ListItem>
                    </UnorderedList>

                    <Stack mt="5" direction={{ base: 'column', sm: 'row' }}>
                        <Text>{t('Enter your CDKey here:')}</Text>
                        <Input w="auto" value={CDKey} onChange={e => setCDKey(e.target.value)} />
                        <Button colorScheme="teal" onClick={() => handleRedeem(CDKey)}>
                            {t('Redeem')}
                        </Button>
                    </Stack>
                </ModalBody>

                <ModalFooter />
            </ModalContent>
        </Modal>
    );
};

export default RedeemModal;
