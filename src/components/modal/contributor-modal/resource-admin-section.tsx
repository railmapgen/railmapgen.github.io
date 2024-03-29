import { Heading, Wrap, WrapItem } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import GithubAvatar from './github-avatar';

const RESOURCE_ADMIN = ['Swiftiecott', 'linchen1965', '28yfang', 'Windows-Taskmgr'];

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
