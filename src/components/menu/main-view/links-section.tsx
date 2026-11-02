import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { getAvailableAsset } from '../../../util/asset-enablements';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Flex, Title } from '@mantine/core';
import LinkItemButton from './link-item-button';

export default function LinksSection() {
    const { t } = useTranslation();

    const availableLinks = getAvailableAsset('link', rmgRuntime.getEnv(), rmgRuntime.getInstance());

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Useful links')}
                </Title>
            </RMSectionHeader>
            <Flex direction="column">
                {availableLinks.map(id => (
                    <LinkItemButton key={id} linkId={id} />
                ))}
            </Flex>
        </RMSection>
    );
}
