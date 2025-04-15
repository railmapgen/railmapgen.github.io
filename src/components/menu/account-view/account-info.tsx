import { ActionIcon, Avatar, Button, Flex, Group, Modal, Text, TextInput } from '@mantine/core';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineDriveFileRenameOutline, MdOutlineLogout, MdOutlinePassword } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { logout, updateName } from '../../../redux/account/account-slice';
import { addNotification } from '../../../redux/notification/notification-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT } from '../../../util/constants';
import PasswordSetup from './password-setup';

const AccountInfo = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isLoggedIn, email, name, refreshToken } = useRootSelector(state => state.account);
    const [isChangeModalType, setIsChangeModalType] = React.useState(undefined as 'name' | 'password' | undefined);

    const handleLogOut = async () => {
        if (!isLoggedIn) return;
        await apiFetch(API_ENDPOINT.AUTH_LOGOUT, {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
        dispatch(logout());
    };

    return (
        <>
            <Flex py="xs" align="center" wrap="wrap">
                <Avatar size="lg" name={name} color="initials" />
                <Flex direction="column" ml="xs" flex={1}>
                    <Text span fw="bold">
                        {name}
                    </Text>
                    <Text span size="sm">
                        {email}
                    </Text>
                </Flex>
                <Flex ml="auto">
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => setIsChangeModalType('name')}
                        aria-label={t('Change name')}
                        title={t('Change name')}
                    >
                        <MdOutlineDriveFileRenameOutline />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={() => setIsChangeModalType('password')}
                        aria-label={t('Change password')}
                        title={t('Change password')}
                    >
                        <MdOutlinePassword />
                    </ActionIcon>
                    <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="sm"
                        onClick={handleLogOut}
                        aria-label={t('Log out')}
                        title={t('Log out')}
                    >
                        <MdOutlineLogout />
                    </ActionIcon>
                </Flex>
            </Flex>
            <ChangeModal infoType={isChangeModalType} onClose={() => setIsChangeModalType(undefined)} />
        </>
    );
};

export default AccountInfo;

export function ChangeModal(props: { infoType: 'name' | 'password' | undefined; onClose: () => void }) {
    const { infoType, onClose } = props;
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const { isLoggedIn, id, token } = useRootSelector(state => state.account);
    const [value, setValue] = React.useState('');

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to update account info'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const handleChange = async () => {
        if (!isLoggedIn || !infoType) return;
        try {
            const rep = await apiFetch(
                API_ENDPOINT.USER + '/' + id,
                { method: 'PATCH', body: JSON.stringify({ [infoType]: value }) },
                token
            );
            if (rep.status === 401) {
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
        } catch (e) {
            showErrorToast((e as Error).message);
        }
    };

    return (
        <Modal opened={!!infoType} onClose={onClose} title={t('Update account info')} closeOnEscape={false}>
            {infoType === 'name' && (
                <TextInput
                    label={t('Name')}
                    value={value}
                    onChange={({ currentTarget: { value } }) => setValue(value)}
                />
            )}
            {infoType === 'password' && <PasswordSetup value={value} onChange={value => setValue(value)} />}
            <Group mt="xs">
                <Button ml="auto" onClick={handleChange}>
                    {t('Change')}
                </Button>
            </Group>
        </Modal>
    );
}
