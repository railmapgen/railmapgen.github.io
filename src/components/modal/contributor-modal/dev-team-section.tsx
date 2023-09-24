import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { Avatar, Heading, SystemStyleObject, Tag, TagLabel, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';

const styles: SystemStyleObject = {
    '& > span': {
        minW: '75%',
        borderRadius: 'lg',
        cursor: 'pointer',

        '& > span:last-of-type': {
            display: 'block',
        },

        '& p': {
            fontSize: 'sm',
            '&:first-of-type': {
                fontSize: 'lg',
                fontWeight: 'bold',
                mb: 1,
            },
        },
    },

    '& .chakra-avatar': {
        ml: 1,
        mr: 3,
        my: 4,
    },
};

export default function DevTeamSection() {
    const { t } = useTranslation();

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h5" size="sm">
                    {t('Developer team')}
                </Heading>
            </RmgSectionHeader>

            <VStack sx={styles}>
                <Tag size="lg" onClick={() => window.open('https://github.com/wongchito', '_blank')}>
                    <Avatar src="https://github.com/wongchito.png" size="lg" />
                    <TagLabel>
                        <Text>Chito Wong</Text>
                        <Text>Author of Rail Map Toolkit platform</Text>
                        <Text>Author of Rail Map Generator</Text>
                    </TagLabel>
                </Tag>
                <Tag size="lg" onClick={() => window.open('https://github.com/thekingofcity', '_blank')}>
                    <Avatar src="https://github.com/thekingofcity.png" size="lg" />
                    <TagLabel>
                        <Text>thekingofcity</Text>
                        <Text>Author of Rail Map Painter</Text>
                        <Text>Author of RMG (Shanghai Metro style)</Text>
                    </TagLabel>
                </Tag>
                <Tag size="lg" onClick={() => window.open('https://github.com/langonginc', '_blank')}>
                    <Avatar src="https://github.com/langonginc.png" size="lg" />
                    <TagLabel>
                        <Text>5+1</Text>
                        <Text>Author of RMP2RMG conversion</Text>
                    </TagLabel>
                </Tag>
            </VStack>
        </RmgSection>
    );
}
