import { Heading, HStack, Image, SystemStyleObject, Text, VStack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import rmpLogo from '../../images/rmp-logo512.png';

const styles: SystemStyleObject = {
    flex: 1,
    justifyContent: 'center',
    mb: 10,

    '& > div': {
        mb: 3,
    },

    '& img': {
        w: 120,
        p: 2,
        backgroundColor: 'white',
        borderRadius: 12,
    },
};

export default function Welcome() {
    const { t } = useTranslation();

    return (
        <VStack sx={styles}>
            <HStack spacing={3}>
                <Image src={import.meta.env.BASE_URL + 'logo512.png'} />
                <Image src={rmpLogo} backgroundColor="white" />
            </HStack>
            <Heading>{t('Welcome to Rail Map Toolkit')}</Heading>
            <Text fontSize="lg" textAlign="center">
                {t('Select an app to start your own rail map design!')}
            </Text>
        </VStack>
    );
}
