import {
    Avatar,
    Button,
    HStack,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Text,
    useToast,
} from '@chakra-ui/react';
import { RmgDebouncedInput, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { logout, setToken, updateName } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';
import { apiFetch } from '../../../util/utils';

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
        <RmgSectionHeader width="100%">
            <Stack width="100%">
                <Avatar size="md" name={name} />
                <HStack width="100%">
                    <Text as="b" fontSize="xl">
                        {email}
                    </Text>
                    <Button size="sm" ml="auto" onClick={handleLogOut}>
                        {t('Log out')}
                    </Button>
                </HStack>
                <HStack width="100%">
                    <Text as="b" fontSize="xl">
                        {name}
                    </Text>
                    <Button size="sm" ml="auto" onClick={() => setIsChangeModalType('name')}>
                        {t('Change name')}
                    </Button>
                </HStack>
                <HStack width="100%">
                    <Button size="sm" ml="auto" onClick={() => setIsChangeModalType('password')}>
                        {t('Change password')}
                    </Button>
                </HStack>
            </Stack>
            <ChangeModal infoType={isChangeModalType} onClose={() => setIsChangeModalType(undefined)} />
        </RmgSectionHeader>
    );
};

export default AccountInfo;

export function ChangeModal(props: { infoType: 'name' | 'password' | undefined; onClose: () => void }) {
    const { infoType, onClose } = props;
    const { t } = useTranslation();
    const toast = useToast();
    const dispatch = useRootDispatch();

    const { isLoggedIn, id, token, refreshToken } = useRootSelector(state => state.account);
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
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(
            API_ENDPOINT.USER + '/' + id,
            { method: 'PATCH', body: JSON.stringify({ [infoType]: value }) },
            token,
            refreshToken
        );
        if (!updatedRefreshToken || !updatedToken) {
            showErrorToast(t('Login status expired'));
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
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
