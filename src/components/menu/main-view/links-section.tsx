import { Events } from '../../../util/constants';
import { Box, Button, Flex, Heading, SystemStyleObject } from '@chakra-ui/react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { MdOpenInNew } from 'react-icons/md';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { assetEnablement, getAvailableAsset } from '../../../util/asset-enablements';

const style: SystemStyleObject = {
    '& button': {
        w: '100%',
        overflow: 'hidden',
        justifyContent: 'flex-start',
        textOverflow: 'ellipsis',
        textAlign: 'start',

        '& span.chakra-button__icon:last-of-type': {
            ml: 'auto',
        },
    },
};

export default function LinksSection() {
    const { t } = useTranslation();

    const availableLinks = getAvailableAsset('link', rmgRuntime.getEnv(), rmgRuntime.getInstance());

    const handleOpenLink = (id: string) => {
        rmgRuntime.event(Events.OPEN_LINK, { id });
        window.open(assetEnablement[id].url, '_blank');
    };

    return (
        <RmgSection sx={style}>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Useful links')}
                </Heading>
            </RmgSectionHeader>
            <Flex direction="column">
                {availableLinks.map(id => (
                    <Button
                        key={id}
                        variant="ghost"
                        size="md"
                        leftIcon={<Box w={4} />}
                        rightIcon={<MdOpenInNew />}
                        onClick={() => handleOpenLink(id)}
                    >
                        {t(assetEnablement[id].name)}
                    </Button>
                ))}
            </Flex>
        </RmgSection>
    );
}
