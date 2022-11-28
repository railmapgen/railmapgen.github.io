import React from 'react';
import { Heading, Image, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

export default function Welcome() {
    const { t } = useTranslation();

    return (
        <VStack flex={1} justifyContent="center" mb={10}>
            <Image
                src={import.meta.env.BASE_URL + 'logo512.png'}
                w={120}
                p={2}
                mb={3}
                backgroundColor="white"
                borderRadius={12}
            />
            <Heading>{t('Welcome to RMG')}</Heading>
            <Text fontSize="lg" textAlign="center">
                {t('Select an app to start your own rail map design!')}
            </Text>
        </VStack>
    );
}
