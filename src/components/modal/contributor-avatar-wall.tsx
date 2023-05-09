import { AppId } from '../../util/constants';
import { Alert, AlertIcon, Flex, SystemStyleObject, Wrap, WrapItem } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { RmgLoader } from '@railmapgen/rmg-components';
import { getAllContributors } from '../../util/avatar-utils';
import GithubAvatar from './github-avatar';
import { useTranslation } from 'react-i18next';

const styles: SystemStyleObject = {
    position: 'relative',
    minH: 20,

    '& .chakra-alert': {
        flexDirection: 'column',
    },

    '& .chakra-alert__icon': {
        boxSize: 7,
        mr: 0,
        mb: 1,
    },
};

interface ContributorAvatarWallProps {
    appId: AppId;
}

export default function ContributorAvatarWall(props: ContributorAvatarWallProps) {
    const { appId } = props;
    const { t } = useTranslation();

    const [contributors, setContributors] = useState<string[]>();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getAllContributors(appId)
            .then(setContributors)
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    return (
        <Flex sx={styles}>
            {isLoading ? (
                <RmgLoader isIndeterminate />
            ) : contributors ? (
                <Wrap spacing={1.5}>
                    {contributors.map(contributor => (
                        <WrapItem key={contributor}>
                            <GithubAvatar login={contributor} urlRepo={appId} size="sm" />
                        </WrapItem>
                    ))}
                </Wrap>
            ) : (
                <Alert status="warning">
                    <AlertIcon />
                    {t('Unable to load contributors')}
                </Alert>
            )}
        </Flex>
    );
}
