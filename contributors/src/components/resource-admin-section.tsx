import { useTranslation } from 'react-i18next';
import GithubAvatar from './github-avatar';
import { Group, Title } from '@mantine/core';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';

const RESOURCE_ADMIN = ['Swiftiecott', 'linchen1965', '28yfang', 'Windows-Taskmgr'];

export default function ResourceAdminSection() {
    const { t } = useTranslation();

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Resource administrators')}
                </Title>
            </RMSectionHeader>

            <Group gap="xs">
                {RESOURCE_ADMIN.map(contributor => (
                    <GithubAvatar key={contributor} login={contributor} size="lg" />
                ))}
            </Group>
        </RMSection>
    );
}
