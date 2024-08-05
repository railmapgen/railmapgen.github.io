import { Button, Flex, FormControl, FormLabel, Heading, Input, useToast } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';

const LoginView = (props: { setLoginState: (_: 'login' | 'register' | 'forgot-password') => void }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleLogIn = async () => {
        const { error, username } = (await dispatch(fetchLogin({ email, password }))).payload as {
            error?: string;
            username?: string;
        };
        if (error) {
            toast({
                title: error,
                status: 'error' as const,
                duration: 9000,
                isClosable: true,
            });
        } else {
            toast({
                title: t('Welcome ') + username,
                status: 'success' as const,
                duration: 5000,
                isClosable: true,
            });
        }
    };

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Log in')}
                </Heading>
            </RmgSectionHeader>

            <Flex p="3" flexDirection="column">
                <FormControl>
                    <FormLabel>{t('Email')}</FormLabel>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                </FormControl>
                <FormControl>
                    <FormLabel>{t('Password')}</FormLabel>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </FormControl>

                <Button onClick={handleLogIn}>{t('Log in')}</Button>
                <Button onClick={() => props.setLoginState('forgot-password')}>{t('Forgot password')}</Button>
                <Button onClick={() => props.setLoginState('register')}>{t('Sign up')}</Button>
            </Flex>
        </RmgSection>
    );
};

export default LoginView;
