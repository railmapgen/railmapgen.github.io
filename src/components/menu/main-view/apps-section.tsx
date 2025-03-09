import { useState } from 'react';
import { AssetType, getAvailableAsset } from '../../../util/asset-enablements';
import AppItemButton from './app-item-button';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import AboutModal from '../../modal/about-modal';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Flex, Title } from '@mantine/core';

type AppsSectionProps = {
    assetType: AssetType;
};

export default function AppsSection({ assetType }: AppsSectionProps) {
    const { t } = useTranslation();

    const [aboutModalAppId, setAboutModalAppId] = useState<string>();

    const availableApps = getAvailableAsset(assetType, rmgRuntime.getEnv(), rmgRuntime.getInstance());

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {assetType === 'devtool' ? t('Devtools') : t('Apps')}
                </Title>
            </RMSectionHeader>
            <Flex direction="column">
                {availableApps.map(appId => (
                    <AppItemButton key={appId} appId={appId} onAboutOpen={() => setAboutModalAppId(appId)} />
                ))}
            </Flex>

            <AboutModal appId={aboutModalAppId} onClose={() => setAboutModalAppId(undefined)} />
        </RMSection>
    );
}
