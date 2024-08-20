import {
    Button,
    Card,
    CardBody,
    CardFooter,
    CardHeader,
    HStack,
    Heading,
    ListItem,
    Stack,
    Text,
    UnorderedList,
    useToast,
} from '@chakra-ui/react';
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
    const toast = useToast();
    const { t } = useTranslation();
    const { isLoggedIn, token, refreshToken } = useRootSelector(state => state.account);
    const dispatch = useRootDispatch();

    const [subscriptions, setSubscriptions] = React.useState([] as APISubscription[]);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = React.useState(false);

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const getSubscriptions = async () => {
        if (!isLoggedIn) return;
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SUBSCRIPTION, {}, token, refreshToken);
        if (!updatedRefreshToken || !updatedToken) {
            showErrorToast(t('Login status expired'));
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
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
        <RmgSection>
            <RmgSectionHeader>
                <HStack width="100%">
                    <Heading as="h4" size="md" my={1}>
                        {t('All subscriptions')}
                    </Heading>
                    <Button size="sm" ml="auto" onClick={() => setIsRedeemModalOpen(true)}>
                        {t('Redeem')}
                    </Button>
                </HStack>
            </RmgSectionHeader>

            <Stack mt="2">
                {subscriptions.length === 0 && (
                    <Card overflow="hidden" variant="outline" mb="3">
                        <CardHeader>
                            <Heading size="md">{t('Rail Map Painter')}</Heading>
                        </CardHeader>
                        <Stack direction={{ base: 'column', sm: 'row' }}>
                            <CardBody>
                                <Stack>
                                    <Text>{t('With this subscription, the following features are unlocked:')}</Text>
                                    <UnorderedList>
                                        <ListItem>
                                            <Text>{t('PRO features')}</Text>
                                        </ListItem>
                                        <ListItem>
                                            <Text>{t('Sync 9 more saves')}</Text>
                                        </ListItem>
                                        <ListItem>
                                            <Text>{t('Unlimited master nodes')}</Text>
                                        </ListItem>
                                        <ListItem>
                                            <Text>{t('Unlimited parallel lines')}</Text>
                                        </ListItem>
                                    </UnorderedList>

                                    <Text>
                                        {t('Expires at:')} {t('Not applicable')}
                                    </Text>
                                </Stack>
                            </CardBody>
                        </Stack>
                    </Card>
                )}

                {subscriptions.map(_ => (
                    <Card key={_.type} overflow="hidden" variant="outline" mb="3">
                        <CardHeader>
                            <Heading size="md">{t(_.type === 'RMP' ? 'Rail Map Painter' : _.type)}</Heading>
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
            </Stack>

            <RedeemModal
                isOpen={isRedeemModalOpen}
                onClose={() => setIsRedeemModalOpen(false)}
                getSubscriptions={getSubscriptions}
            />
        </RmgSection>
    );
};

export default SubscriptionSection;
