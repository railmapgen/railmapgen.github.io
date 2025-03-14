import { assetEnablement } from '../../../src/util/asset-enablements';
import ContributorAvatarWall from './contributor-avatar-wall';
import { useTranslation } from 'react-i18next';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Text, Title } from '@mantine/core';

export default function ResourceContributorSection() {
    const { t } = useTranslation();

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Resource contributors')}
                </Title>
            </RMSectionHeader>

            <RMSectionBody direction="column" gap="xs">
                {Object.entries(assetEnablement)
                    .filter(([, detail]) => detail.showContributors)
                    .map(([appId, detail]) => (
                        <RMSection key={appId}>
                            <RMSectionHeader>
                                <Title order={3} size="h5">
                                    {t(detail.name)}
                                </Title>
                            </RMSectionHeader>
                            <ContributorAvatarWall key={appId} appId={appId} />
                        </RMSection>
                    ))}

                <Text fs="italic">{t('Notes: Contributors are sorted by number of commits and commit time.')}</Text>
            </RMSectionBody>
        </RMSection>
    );
}
