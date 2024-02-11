import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { Heading, SystemStyleObject, Text } from '@chakra-ui/react';
import { assetEnablement } from '../../../util/asset-enablements';
import React, { Fragment } from 'react';
import ContributorAvatarWall from './contributor-avatar-wall';
import { useTranslation } from 'react-i18next';

const styles: SystemStyleObject = {
    '& > *:not(.rmg-section__header)': {
        px: 2,
    },

    '& h6': {
        my: 2,
    },
};

export default function ResourceContributorSection() {
    const { t } = useTranslation();

    return (
        <RmgSection sx={styles}>
            <RmgSectionHeader>
                <Heading as="h5" size="sm">
                    {t('Resource contributors')}
                </Heading>
            </RmgSectionHeader>

            {Object.entries(assetEnablement)
                .filter(([_, detail]) => detail.showContributors)
                .map(([appId, detail]) => (
                    <Fragment key={appId}>
                        <Heading as="h6" size="xs">
                            {t(detail.name)}
                        </Heading>
                        <ContributorAvatarWall key={appId} appId={appId} />
                    </Fragment>
                ))}

            <Text as="i" fontSize="xs" mt={3}>
                {t('Notes: Contributors are sorted by number of commits and commit time.')}
            </Text>
        </RmgSection>
    );
}
