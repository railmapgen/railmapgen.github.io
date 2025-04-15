import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import {
    ActiveSubscriptions,
    defaultActiveSubscriptions,
    logout,
    setActiveSubscriptions,
} from '../../../redux/account/account-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT } from '../../../util/constants';
import RedeemModal from '../../modal/redeem-modal';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Button, Card, List, Stack, Text, Title } from '@mantine/core';
import { addNotification } from '../../../redux/notification/notification-slice';

interface APISubscription {
    type: 'RMP' | 'RMP_CLOUD' | 'RMP_EXPORT';
    expires: string;
}

const SubscriptionSection = () => {
    const { t } = useTranslation();
    const { isLoggedIn, token } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const [subscriptions, setSubscriptions] = React.useState([] as APISubscription[]);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = React.useState(false);

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to retrieve your subscriptions'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const getSubscriptions = async () => {
        if (!isLoggedIn) return;
        const rep = await apiFetch(API_ENDPOINT.SUBSCRIPTION, {}, token);
        if (rep.status === 401) {
            showErrorToast(t('Login status expired'));
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        const subscriptions = (await rep.json()).subscriptions as APISubscription[];
        if (!subscriptions.map(_ => _.type).includes('RMP_CLOUD')) return;
        setSubscriptions([{ type: 'RMP', expires: subscriptions[0].expires }]);

        const activeSubscriptions = structuredClone(defaultActiveSubscriptions);
        for (const subscription of subscriptions) {
            const type = subscription.type;
            if (type in activeSubscriptions) {
                activeSubscriptions[type as keyof ActiveSubscriptions] = true;
            }
        }
        dispatch(setActiveSubscriptions(activeSubscriptions));
    };
    React.useEffect(() => {
        getSubscriptions();
    }, []);

    return (
        <RMSection>
            <RMSectionHeader align="center">
                <Title order={3} size="h5">
                    {t('All subscriptions')}
                </Title>
                <Button variant="subtle" size="xs" ml="auto" onClick={() => setIsRedeemModalOpen(true)}>
                    {t('Redeem')}
                </Button>
            </RMSectionHeader>

            <RMSectionBody direction="column" gap="xs">
                {subscriptions.length === 0 && (
                    <Card withBorder shadow="sm">
                        <Card.Section p="xs">
                            <Title order={4} size="h3">
                                {t('Rail Map Painter')}
                            </Title>
                        </Card.Section>
                        <Stack gap="xs">
                            <Text>{t('With this subscription, the following features are unlocked:')}</Text>
                            <List withPadding>
                                <List.Item>{t('PRO features')}</List.Item>
                                <List.Item>{t('Sync 9 more saves')}</List.Item>
                                <List.Item>{t('Unlimited master nodes')}</List.Item>
                                <List.Item>{t('Unlimited parallel lines')}</List.Item>
                            </List>

                            <Text>
                                {t('Expires at:')} {t('Not applicable')}
                            </Text>
                        </Stack>
                    </Card>
                )}

                {subscriptions.map(_ => (
                    <Card key={_.type} withBorder shadow="sm">
                        <Card.Section p="xs">
                            <Title order={4} size="h3">
                                {t(_.type === 'RMP' ? 'Rail Map Painter' : _.type)}
                            </Title>
                        </Card.Section>
                        <Stack gap="xs">
                            <Text>
                                {t('Expires at:')} {new Date(_.expires).toLocaleString()}
                            </Text>
                            <Button color="blue" onClick={() => setIsRedeemModalOpen(true)}>
                                {t('Renew')}
                            </Button>
                        </Stack>
                    </Card>
                ))}
            </RMSectionBody>

            <RedeemModal
                opened={isRedeemModalOpen}
                onClose={() => setIsRedeemModalOpen(false)}
                getSubscriptions={getSubscriptions}
            />
        </RMSection>
    );
};

export default SubscriptionSection;
