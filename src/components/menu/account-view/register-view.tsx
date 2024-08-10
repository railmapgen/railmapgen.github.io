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
    Stack,
    useToast,
} from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';

const RegisterView = (props: { setLoginState: (_: 'login' | 'register') => void }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [name, setName] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [emailVerificationToken, setEmailVerificationToken] = React.useState('');

    const [emailVerificationSent, setEmailVerificationSent] = React.useState('');

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const handleVerifyEmail = async () => {
        const rep = await fetch(API_URL + API_ENDPOINT.AUTH_SEND_VERIFICATION_EMAIL, {
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
        const registerRep = await fetch(API_URL + API_ENDPOINT.AUTH_REGISTER, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, password, emailVerificationToken: Number(emailVerificationToken) }),
        });
        if (registerRep.status !== 201) {
            showErrorToast(await registerRep.text());
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
                <Stack spacing="25px">
                    <FormControl>
                        <FormLabel>{t('Name')}</FormLabel>
                        <Input type="text" value={name} onChange={e => setName(e.target.value)} />
                        <FormHelperText>{t('You may always change it later.')}</FormHelperText>
                    </FormControl>
                    <FormControl>
                        <FormLabel>{t('Email')}</FormLabel>
                        <InputGroup size="md">
                            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
                            <InputRightElement width="auto">
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
                </Stack>

                <Stack mt="10">
                    <Button onClick={handleRegister}>{t('Sign up')}</Button>
                    <Button onClick={() => props.setLoginState('login')}>{t('Back to log in')}</Button>
                </Stack>
            </Flex>
        </RmgSection>
    );
};

export default RegisterView;
