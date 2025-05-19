import { Button, Card, List, Stack, Text, Title, Tooltip } from '@mantine/core';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootSelector } from '../../../redux';
import RedeemModal from '../../modal/redeem-modal';

const DAYS_TO_REMIND_RENEW = 90;
const MILLISECONDS_TO_REMIND_RENEW = DAYS_TO_REMIND_RENEW * 24 * 60 * 60 * 1000;

const SubscriptionSection = () => {
    const { t } = useTranslation();

    const { activeSubscriptions } = useRootSelector(state => state.account);
    const [isRedeemModalOpen, setIsRedeemModalOpen] = React.useState(false);

    const noneSubscription = !activeSubscriptions.RMP_CLOUD && !activeSubscriptions.RMP_EXPORT;

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
                {noneSubscription && (
                    <Card withBorder shadow="sm">
                        <Card.Section p="xs">
                            <Text fw="bold">{t('Rail Map Painter')}</Text>
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

                {!noneSubscription && (
                    <Card withBorder shadow="sm">
                        <Card.Section p="xs">
                            <Text fw="bold">{t('Rail Map Painter')}</Text>
                        </Card.Section>
                        <Stack gap="xs">
                            <Text>
                                {t('Expires at:')} {new Date(activeSubscriptions.RMP_CLOUD!).toLocaleString()}
                            </Text>
                            {new Date(activeSubscriptions.RMP_CLOUD!).getTime() - new Date().getTime() <
                            MILLISECONDS_TO_REMIND_RENEW ? (
                                <Tooltip
                                    opened
                                    label={t('Renew now and get an extra 45 days!')}
                                    position="bottom"
                                    withArrow
                                >
                                    <Button color="blue" onClick={() => setIsRedeemModalOpen(true)}>
                                        {t('Renew')}
                                    </Button>
                                </Tooltip>
                            ) : (
                                <Button color="blue" onClick={() => setIsRedeemModalOpen(true)}>
                                    {t('Renew')}
                                </Button>
                            )}
                        </Stack>
                    </Card>
                )}

                {/* {Object.entries(activeSubscriptions)
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    .filter(([_, expires]) => expires)
                    .map(([type, expires]) => (
                        <Card key={type} withBorder shadow="sm">
                            <Card.Section p="xs">
                                <Text fw="bold">{t(type)}</Text>
                            </Card.Section>
                            <Stack gap="xs">
                                <Text>
                                    {t('Expires at:')} {new Date(expires).toLocaleString()}
                                </Text>
                                {new Date(expires).getTime() - new Date().getTime() < MILLISECONDS_TO_REMIND_RENEW ? (
                                    <Tooltip
                                        opened
                                        label={t('Renew now and get an extra 45 days!')}
                                        position="bottom"
                                        withArrow
                                    >
                                        <Button color="blue" onClick={() => setIsRedeemModalOpen(true)}>
                                            {t('Renew')}
                                        </Button>
                                    </Tooltip>
                                ) : (
                                    <Button color="blue" onClick={() => setIsRedeemModalOpen(true)}>
                                        {t('Renew')}
                                    </Button>
                                )}
                            </Stack>
                        </Card>
                    ))} */}
            </RMSectionBody>

            <RedeemModal opened={isRedeemModalOpen} onClose={() => setIsRedeemModalOpen(false)} />
        </RMSection>
    );
};

export default SubscriptionSection;
