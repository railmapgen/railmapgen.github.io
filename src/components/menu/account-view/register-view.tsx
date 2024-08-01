import {
    Alert,
    AlertDescription,
    AlertIcon,
    Button,
    Flex,
    FormControl,
    FormHelperText,
    FormLabel,
    Heading,
    Input,
    InputGroup,
    InputRightElement,
} from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { login } from '../../../redux/account/account-slice';
import { API_ENDPOINT } from '../../../util/constants';

interface LoginResponse {
    user: { name: string };
    tokens: { access: { token: string }; refresh: { token: string } };
}

const RegisterView = (props: { setLoginOrRegister: (_: 'login' | 'register') => void }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [emailVerificationToken, setEmailVerificationToken] = React.useState('');

    const [emailVerificationSent, setEmailVerificationSent] = React.useState('');

    const handleVerifyEmail = async () => {
        const rep = await fetch(API_ENDPOINT.AUTH_SEND_VERIFICATION_EMAIL, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        if (rep.status === 204) {
            setEmailVerificationSent(email);
            return;
        }
        if (rep.status === 400) {
            setEmailVerificationSent('error');
            return;
        }
    };

    const handleRegister = async () => {
        const registerRep = await fetch(API_ENDPOINT.AUTH_REGISTER, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, emailVerificationToken: Number(emailVerificationToken) }),
        });
        if (registerRep.status !== 201) return;
        const loginRes = await fetch(API_ENDPOINT.AUTH_LOGIN, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        if (loginRes.status !== 200) return;
        const {
            user: { name: username },
            tokens: {
                access: { token },
                refresh: { token: refreshToken },
            },
        } = (await loginRes.json()) as LoginResponse;
        dispatch(login({ name: username, email, token, refreshToken }));
    };

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Sign up')}
                </Heading>
            </RmgSectionHeader>

            {emailVerificationSent && (
                <Alert status={emailVerificationSent === 'error' ? 'error' : 'info'}>
                    <AlertIcon />
                    <AlertDescription>
                        {emailVerificationSent === 'error'
                            ? t('The email is not valid!')
                            : t('Verification email is sent to: ') + emailVerificationSent}
                    </AlertDescription>
                </Alert>
            )}

            <Flex p="3" flexDirection="column">
                <FormControl>
                    <FormLabel>{t('Name')}</FormLabel>
                    <Input type="text" value={name} onChange={e => setName(e.target.value)} />
                    <FormHelperText>{t('You may always change it later.')}</FormHelperText>
                </FormControl>
                <FormControl>
                    <FormLabel>{t('Email')}</FormLabel>
                    <InputGroup size="md">
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        <InputRightElement width="4.5rem">
                            <Button h="1.75rem" size="sm" onClick={handleVerifyEmail}>
                                {t('Send verification code')}
                            </Button>
                        </InputRightElement>
                    </InputGroup>
                    <FormHelperText>{t("We'll never share your email.")}</FormHelperText>
                </FormControl>
                <FormControl>
                    <FormLabel>{t('Verification code')}</FormLabel>
                    <Input
                        type="number"
                        value={emailVerificationToken}
                        onChange={e => setEmailVerificationToken(e.target.value)}
                    />
                </FormControl>
                <FormControl>
                    <FormLabel>{t('Password')}</FormLabel>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </FormControl>

                <Button onClick={handleRegister}>{t('Sign up')}</Button>
                <Button onClick={() => props.setLoginOrRegister('login')}>{t('Back to log in')}</Button>
            </Flex>
        </RmgSection>
    );
};

export default RegisterView;
