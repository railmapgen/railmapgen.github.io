import { RMSectionBody } from '@railmapgen/mantine-components';
import { Alert, Group, LoadingOverlay } from '@mantine/core';
import { MdWarning } from 'react-icons/md';
import GithubAvatar from './github-avatar';
import { useTranslation } from 'react-i18next';

type AvatarWallProps = {
    contributors: string[];
    isLoading: boolean;
    isError: boolean;
    appId?: string;
};

export default function AvatarWall({ contributors, isLoading, isError, appId }: AvatarWallProps) {
    const { t } = useTranslation();

    return (
        <RMSectionBody>
            <LoadingOverlay visible={isLoading} />

            {isError && (
                <Alert color="yellow" icon={<MdWarning />} title={t('Unable to load donators')} flex={1}></Alert>
            )}

            {!isError && contributors && (
                <Group gap="xs">
                    {contributors?.map(contributor => (
                        <GithubAvatar key={contributor} login={contributor} urlRepo={appId} />
                    ))}
                </Group>
            )}
        </RMSectionBody>
    );
}
