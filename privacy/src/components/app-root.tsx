import { Anchor, List, Text, Title } from '@mantine/core';
import { RMMantineProvider, RMPage, RMPageBody, RMWindow, RMWindowHeader } from '@railmapgen/mantine-components';
import { useTranslation } from 'react-i18next';
import classes from './app-root.module.css';

export default function AppRoot() {
    const { t } = useTranslation();

    return (
        <RMMantineProvider>
            <RMWindow>
                <RMWindowHeader>
                    <Title>{t('Privacy')}</Title>
                </RMWindowHeader>
                <RMPage w={{ base: '100%', sm: 600 }} style={{ alignSelf: 'center' }}>
                    <RMPageBody className={classes.body}>
                        <Text>{t('PrivacyPage.intro')}</Text>
                        <List spacing="sm" withPadding>
                            <List.Item>{t('PrivacyPage.email')}</List.Item>
                            <List.Item>{t('PrivacyPage.location')}</List.Item>
                            <List.Item>{t('PrivacyPage.interaction')}</List.Item>
                        </List>
                        <Text>{t('PrivacyPage.analytics')}</Text>
                        <Anchor
                            href="https://support.google.com/analytics/answer/6004245"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {t('PrivacyPage.ga4Link')}
                        </Anchor>
                    </RMPageBody>
                </RMPage>
            </RMWindow>
        </RMMantineProvider>
    );
}
