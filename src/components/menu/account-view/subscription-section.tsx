import { Button, Card, CardBody, CardFooter, CardHeader, Heading, Stack, Text } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import {
    ActiveSubscriptions,
    defaultActiveSubscriptions,
    setActiveSubscriptions,
    setToken,
} from '../../../redux/account/account-slice';
import { API_ENDPOINT } from '../../../util/constants';
import { apiFetch } from '../../../util/utils';
import RedeemModal from '../../modal/redeem-modal';

interface APISubscription {
    type: 'RMP' | 'RMP_CLOUD' | 'RMP_EXPORT';
    expires: string;
}

const SubscriptionSection = () => {
    const { t } = useTranslation();
    const { isLoggedIn, token, refreshToken } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const [subscriptions, setSubscriptions] = React.useState([] as APISubscription[]);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = React.useState(false);

    const getSubscriptions = async () => {
        if (!isLoggedIn) return;
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SUBSCRIPTION, {}, token, refreshToken);
        if (!updatedRefreshToken || !updatedToken) return;
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
        if (rep.status !== 200) return;
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
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('All subscriptions')}
                </Heading>
            </RmgSectionHeader>

            {subscriptions.map(_ => (
                <Card key={_.type} overflow="hidden" variant="outline" mb="3">
                    <CardHeader>
                        <Heading size="md">{t(_.type)}</Heading>
                    </CardHeader>
                    <Stack direction={{ base: 'column', sm: 'row' }}>
                        <CardBody>
                            <Text py="2">
                                {t('Expires at:')} {new Date(_.expires).toLocaleString()}
                            </Text>
                        </CardBody>
                        <CardFooter>
                            <Button variant="solid" colorScheme="blue">
                                {t('Renew')}
                            </Button>
                        </CardFooter>
                    </Stack>
                </Card>
            ))}

            <Button onClick={() => setIsRedeemModalOpen(true)}>{t('Redeem')}</Button>

            <RedeemModal
                isOpen={isRedeemModalOpen}
                onClose={() => setIsRedeemModalOpen(false)}
                getSubscriptions={getSubscriptions}
            />
        </RmgSection>
    );
};

export default SubscriptionSection;
