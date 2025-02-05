import {
    Avatar,
    Button,
    Flex,
    HStack,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SystemStyleObject,
    Text,
    useToast,
    VStack,
} from '@chakra-ui/react';
import { RmgDebouncedInput } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDriveFileRenameOutline, MdLogout, MdPassword } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { logout, updateName } from '../../../redux/account/account-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT, API_URL } from '../../../util/constants';

const style: SystemStyleObject = {
    alignItems: 'center',
    m: 2,
    px: 3,

    alignSelf: { base: 'center', md: 'auto' },
    maxW: { base: '100vw', md: 'unset' },
    w: { base: 400, md: 'unset' },
};

const AccountInfo = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isLoggedIn, email, name, refreshToken } = useRootSelector(state => state.account);
    const [isChangeModalType, setIsChangeModalType] = React.useState(undefined as 'name' | 'password' | undefined);

    const handleLogOut = async () => {
        if (!isLoggedIn) return;
        await fetch(API_URL + API_ENDPOINT.AUTH_LOGOUT, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });
        dispatch(logout());
    };

    return (
        <>
            <Flex sx={style}>
                <Avatar size="md" name={name} />
                <VStack spacing={0} alignItems="flex-start" ml={2}>
                    <Text as="b">{name}</Text>
                    <Text fontSize="sm">{email}</Text>
                </VStack>
                <HStack ml="auto" spacing={1}>
                    <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsChangeModalType('name')}
                        aria-label={t('Change name')}
                        title={t('Change name')}
                        icon={<MdDriveFileRenameOutline />}
                    />
                    <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsChangeModalType('password')}
                        aria-label={t('Change password')}
                        title={t('Change password')}
                        icon={<MdPassword />}
                    />
                    <IconButton
                        variant="ghost"
                        size="sm"
                        onClick={handleLogOut}
                        aria-label={t('Log out')}
                        title={t('Log out')}
                        icon={<MdLogout />}
                    />
                </HStack>
            </Flex>
            <ChangeModal infoType={isChangeModalType} onClose={() => setIsChangeModalType(undefined)} />
        </>
    );
};

export default AccountInfo;

export function ChangeModal(props: { infoType: 'name' | 'password' | undefined; onClose: () => void }) {
    const { infoType, onClose } = props;
    const { t } = useTranslation();
    const toast = useToast();
    const dispatch = useRootDispatch();

    const { isLoggedIn, id, token } = useRootSelector(state => state.account);
    const [value, setValue] = React.useState('');

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const handleChange = async () => {
        if (!isLoggedIn || !infoType) return;
        const rep = await apiFetch(
            API_ENDPOINT.USER + '/' + id,
            { method: 'PATCH', body: JSON.stringify({ [infoType]: value }) },
            token
        );
        if (!rep) {
            showErrorToast(t('Login status expired'));
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        if (infoType === 'password') {
            dispatch(logout());
            onClose();
            return;
        }
        if (infoType === 'name') {
            dispatch(updateName(value));
            onClose();
            return;
        }
    };

    return (
        <Modal isOpen={infoType ? true : false} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Update account info')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <RmgDebouncedInput defaultValue={value} onDebouncedChange={val => setValue(val)} />
                </ModalBody>

                <ModalFooter>
                    <Button onClick={handleChange}>{t('Change')}</Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
