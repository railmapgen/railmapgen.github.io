import { Button, Flex, FormControl, FormLabel, Heading, Input, useToast } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchSaveList, login } from '../../../redux/account/account-slice';
import { API_ENDPOINT } from '../../../util/constants';
import { apiFetch } from '../../../util/utils';

interface LoginResponse {
    user: { name: string };
    tokens: { access: { token: string }; refresh: { token: string } };
}

const LoginView = (props: { setLoginOrRegister: (_: 'login' | 'register') => void }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');

    const handleLogIn = async () => {
        const { rep } = await apiFetch(API_ENDPOINT.AUTH_LOGIN, {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        const {
            user: { name },
            tokens: {
                access: { token },
                refresh: { token: refreshToken },
            },
        } = (await rep.json()) as LoginResponse;
        dispatch(login({ name, email, token, refreshToken }));
        dispatch(fetchSaveList());
        toast({
            title: t('Welcome ') + name,
            status: 'success' as const,
            duration: 5000,
            isClosable: true,
        });
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
                <Button onClick={() => props.setLoginOrRegister('register')}>{t('Sign up')}</Button>
            </Flex>
        </RmgSection>
    );
};

export default LoginView;
