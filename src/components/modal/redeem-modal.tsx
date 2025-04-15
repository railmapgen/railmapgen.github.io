import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { logout } from '../../redux/account/account-slice';
import { apiFetch } from '../../util/api';
import { API_ENDPOINT } from '../../util/constants';
import { Anchor, Button, Group, List, Modal, Text, TextInput } from '@mantine/core';
import { addNotification } from '../../redux/notification/notification-slice';

const RedeemModal = (props: { opened: boolean; onClose: () => void; getSubscriptions: () => Promise<void> }) => {
    const { t } = useTranslation();
    const { opened, onClose, getSubscriptions } = props;
    const { isLoggedIn, token } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const [CDKey, setCDKey] = React.useState('');

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to redeem'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const handleRedeem = async (CDKey: string) => {
        if (!isLoggedIn) return;
        const rep = await apiFetch(
            API_ENDPOINT.SUBSCRIPTION_REDEEM,
            { method: 'POST', body: JSON.stringify({ cdkey: CDKey.trim() }) },
            token
        );
        if (rep.status === 401) {
            showErrorToast(t('Login status expired'));
            dispatch(logout());
            return;
        }
        if (rep.status !== 202) {
            const msg = (await rep.json()).message;
            showErrorToast(t(msg));
            return;
        }
        await getSubscriptions();
        // TODO: let RMP refresh its subscription status
        onClose();
    };

    return (
        <Modal opened={opened} onClose={onClose} title={t('Redeem your subscription')}>
            <Text>{t('CDKey could be purchased in the following sites:')}</Text>
            <List withPadding mt="xs">
                <List.Item>
                    <Anchor href="https://afdian.com/item/9c8b220c614311efab2d52540025c377" target="_blank">
                        爱发电 <MdOpenInNew />
                    </Anchor>
                </List.Item>
            </List>

            <Group align="flex-end" gap="sm" mt="xs">
                <TextInput
                    label="CDKey"
                    placeholder={t('Enter your CDKey here')}
                    value={CDKey}
                    onChange={({ currentTarget: { value } }) => setCDKey(value)}
                    style={{ minWidth: 240 }}
                />
                <Button onClick={() => handleRedeem(CDKey)}>{t('Redeem')}</Button>
            </Group>
        </Modal>
    );
};

export default RedeemModal;
