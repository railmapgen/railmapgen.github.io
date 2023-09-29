import { Alert, AlertIcon, Flex, Heading, SystemStyleObject, Wrap, WrapItem } from '@chakra-ui/react';
import { RmgLoader, RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import useDonators from '../../hook/use-donators';
import GithubAvatar from './github-avatar';

const styles: SystemStyleObject = {
    position: 'relative',
    px: 2,
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

export default function DonatorSection() {
    const { t } = useTranslation();

    const { donators, isLoading, isError } = useDonators();

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h5" size="sm">
                    {'❤️ ' + t('Donators')}
                </Heading>
            </RmgSectionHeader>

            <Flex sx={styles}>
                {isLoading && <RmgLoader isIndeterminate />}

                {isError && (
                    <Alert status="warning">
                        <AlertIcon />
                        {t('Unable to load donators')}
                    </Alert>
                )}

                {!isError && donators && (
                    <Wrap spacing={1.5}>
                        {donators?.map(donator => (
                            <WrapItem key={donator}>
                                <GithubAvatar login={donator} size="sm" />
                            </WrapItem>
                        ))}
                    </Wrap>
                )}
            </Flex>
        </RmgSection>
    );
}
