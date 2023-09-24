import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { Heading, Wrap, WrapItem } from '@chakra-ui/react';
import GithubAvatar from './github-avatar';
import React from 'react';
import { useTranslation } from 'react-i18next';

const RESOURCE_ADMIN = ['52PD', 'linchen1965'];

export default function ResourceAdminSection() {
    const { t } = useTranslation();

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h5" size="sm">
                    {t('Resource administrators')}
                </Heading>
            </RmgSectionHeader>

            <Wrap spacing={1.5} px={2}>
                {RESOURCE_ADMIN.map(contributor => (
                    <WrapItem key={contributor}>
                        <GithubAvatar login={contributor} size="md" />
                    </WrapItem>
                ))}
            </Wrap>
        </RmgSection>
    );
}
