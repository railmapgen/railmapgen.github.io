import React, { useState } from 'react';
import { AssetType, getAvailableAsset } from '../../util/asset-enablements';
import { Flex, Heading } from '@chakra-ui/react';
import AppItemButton from './app-item-button';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import AboutModal from '../modal/about-modal';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';

type AppsSectionProps = {
    assetType: AssetType;
};

export default function AppsSection({ assetType }: AppsSectionProps) {
    const { t } = useTranslation();

    const [aboutModalAppId, setAboutModalAppId] = useState<string>();

    const availableApps = getAvailableAsset(assetType, rmgRuntime.getEnv(), rmgRuntime.getInstance());

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {assetType === 'devtool' ? t('Devtools') : t('Apps')}
                </Heading>
            </RmgSectionHeader>
            <Flex direction="column">
                {availableApps.map(appId => (
                    <AppItemButton key={appId} appId={appId} onAboutOpen={() => setAboutModalAppId(appId)} />
                ))}
            </Flex>

            <AboutModal appId={aboutModalAppId} onClose={() => setAboutModalAppId(undefined)} />
        </RmgSection>
    );
}
