import React, { useState } from 'react';
import { getAvailableAsset } from '../../util/constants';
import { Flex, Heading } from '@chakra-ui/react';
import AppItemButton from './app-item-button';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import AboutModal from '../modal/about-modal';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';

export default function AppsSection() {
    const { t } = useTranslation();

    const [aboutModalAppId, setAboutModalAppId] = useState<string>();

    const availableApps = getAvailableAsset('app', rmgRuntime.getEnv(), rmgRuntime.getInstance());

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Apps')}
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
