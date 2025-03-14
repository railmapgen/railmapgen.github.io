import useContributors from './hook/use-contributors';
import { RMSectionBody } from '@railmapgen/mantine-components';
import { Alert, Group, LoadingOverlay } from '@mantine/core';
import { MdWarning } from 'react-icons/md';
import GithubAvatar from './github-avatar';
import { useTranslation } from 'react-i18next';

interface ContributorAvatarWallProps {
    appId: string;
}

export default function ContributorAvatarWall(props: ContributorAvatarWallProps) {
    const { appId } = props;
    const { t } = useTranslation();

    const { contributors, isLoading, isError } = useContributors(appId);

    return (
        <RMSectionBody>
            <LoadingOverlay visible={isLoading} />

            {isError && (
                <Alert color="yellow" icon={<MdWarning />} title={t('Unable to load contributors')} flex={1}></Alert>
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
