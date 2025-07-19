import { useTranslation } from 'react-i18next';
import useDonators from './hook/use-donators';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Alert, Group, LoadingOverlay, Title } from '@mantine/core';
import { MdWarning } from 'react-icons/md';
import GithubAvatar from './github-avatar';

export default function DonatorSection() {
    const { t } = useTranslation();

    const { donators, isLoading, isError } = useDonators();

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {'❤️ ' + t('Donators')}
                </Title>
            </RMSectionHeader>

            <RMSectionBody>
                <LoadingOverlay visible={isLoading} />

                {isError && (
                    <Alert color="yellow" icon={<MdWarning />} title={t('Unable to load donators')} flex={1}></Alert>
                )}

                {!isError && donators && (
                    <Group gap="xs">
                        {donators?.map(contributor => (
                            <GithubAvatar key={contributor} login={contributor} />
                        ))}
                    </Group>
                )}
            </RMSectionBody>
        </RMSection>
    );
}
