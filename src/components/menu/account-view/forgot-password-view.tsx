import {
    Alert,
    AlertDescription,
    AlertIcon,
    Button,
    Flex,
    FormControl,
    FormLabel,
    Heading,
    Input,
    InputGroup,
    InputRightElement,
    Stack,
    useToast,
} from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';

const ForgotPasswordView = (props: { setLoginState: (_: 'login' | 'register' | 'forgot-password') => void }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [resetPasswordToken, setResetPasswordToken] = React.useState('');

    const [emailResetPasswordSent, setEmailResetPasswordSent] = React.useState('');

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const handleSendResetPasswordEmail = async () => {
        const rep = await fetch(API_URL + API_ENDPOINT.AUTH_SEND_RESET_PASSWORD_EMAIL, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });
        if (rep.status === 204) {
            setEmailResetPasswordSent(email);
            return;
        }
        if (rep.status === 400) {
            setEmailResetPasswordSent('error');
            return;
        }
    };

    const handleResetPassword = async () => {
        const resetPasswordParam = new URLSearchParams({ token: resetPasswordToken });
        const resetPasswordURL = `${API_URL}${API_ENDPOINT.AUTH_RESET_PASSWORD}?${resetPasswordParam.toString()}`;
        const resetPasswordRep = await fetch(resetPasswordURL, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password }),
        });
        if (resetPasswordRep.status !== 204) {
            showErrorToast(await resetPasswordRep.text());
            return;
        }

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
                    {t('Forgot password')}
                </Heading>
            </RmgSectionHeader>

            {emailResetPasswordSent && (
                <Alert status={emailResetPasswordSent === 'error' ? 'error' : 'info'}>
                    <AlertIcon />
                    <AlertDescription>
                        {emailResetPasswordSent === 'error'
                            ? t('Check your email again!')
                            : t('Email with reset link is sent to: ') + emailResetPasswordSent}
                    </AlertDescription>
                </Alert>
            )}

            <Flex p="3" flexDirection="column">
                <FormControl>
                    <FormLabel>{t('Email')}</FormLabel>
                    <InputGroup size="md">
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                        <InputRightElement width="4.5rem">
                            <Button h="1.75rem" size="sm" onClick={handleSendResetPasswordEmail}>
                                {t('Send reset link')}
                            </Button>
                        </InputRightElement>
                    </InputGroup>
                </FormControl>
                <FormControl>
                    <FormLabel>{t('Reset password token')}</FormLabel>
                    <Input value={resetPasswordToken} onChange={e => setResetPasswordToken(e.target.value)} />
                </FormControl>
                <FormControl>
                    <FormLabel>{t('Password')}</FormLabel>
                    <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
                </FormControl>

                <Stack mt="10">
                    <Button onClick={handleResetPassword}>{t('Reset password')}</Button>
                    <Button onClick={() => props.setLoginState('login')}>{t('Back to log in')}</Button>
                </Stack>
            </Flex>
        </RmgSection>
    );
};

export default ForgotPasswordView;
