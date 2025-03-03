import { useToast } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdOutlineErrorOutline, MdOutlineInfo } from 'react-icons/md';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';
import { emailValidator, passwordValidator } from './account-utils';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Alert, Button, TextInput, Title } from '@mantine/core';
import PasswordSetup from './password-setup';

const sendEmailVerificationInterval = 60;

const RegisterView = (props: { setLoginState: (_: 'login' | 'register') => void }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailVerificationToken, setEmailVerificationToken] = useState('');
    const [emailVerificationSent, setEmailVerificationSent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [isSendEmailVerificationDisabled, setIsSendEmailVerificationDisabled] = useState(false);
    const [sendEmailVerificationDisabledseconds, setSendEmailVerificationDisabledSeconds] =
        useState(sendEmailVerificationInterval);

    useEffect(() => {
        let timer: number;
        if (isSendEmailVerificationDisabled && sendEmailVerificationDisabledseconds > 0) {
            timer = window.setTimeout(() => {
                setSendEmailVerificationDisabledSeconds(sendEmailVerificationDisabledseconds - 1);
            }, 1000);
        } else if (sendEmailVerificationDisabledseconds === 0) {
            setIsSendEmailVerificationDisabled(false);
        }

        return () => clearTimeout(timer);
    }, [isSendEmailVerificationDisabled, sendEmailVerificationDisabledseconds]);

    const isEmailValid = !!email && emailValidator(email);
    const areFieldsValid =
        !!name && isEmailValid && !!emailVerificationToken && !!password && passwordValidator(password);

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const handleVerifyEmail = async () => {
        setIsSendEmailVerificationDisabled(true);
        setSendEmailVerificationDisabledSeconds(sendEmailVerificationInterval);
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
        setIsLoading(true);
        try {
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
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={3} size="h5">
                    {t('Create an account')}
                </Title>
            </RMSectionHeader>

            <RMSectionBody direction="column" gap="xs">
                {emailVerificationSent === 'error' && (
                    <Alert color="red" icon={<MdOutlineErrorOutline />} title={t('The email is not valid!')} />
                )}
                {emailVerificationSent && emailVerificationSent !== 'error' && (
                    <Alert
                        color="blue"
                        icon={<MdOutlineInfo />}
                        title={t('Verification email is sent to') + ' ' + emailVerificationSent}
                    />
                )}

                <TextInput
                    label={t('Name')}
                    description={t('You may always change it later.')}
                    value={name}
                    onChange={({ currentTarget: { value } }) => setName(value)}
                />
                <TextInput
                    label={t('Email')}
                    description={t("We'll never share your email.")}
                    value={email}
                    onChange={({ currentTarget: { value } }) => setEmail(value)}
                    error={email && !emailValidator(email)}
                    rightSection={
                        emailVerificationSent ? (
                            <Button variant="transparent" size="xs" leftSection={<MdCheck />} disabled>
                                {t('Verification code sent')}
                            </Button>
                        ) : (
                            <Button
                                variant="subtle"
                                size="xs"
                                onClick={handleVerifyEmail}
                                disabled={!isEmailValid || isSendEmailVerificationDisabled}
                            >
                                {isSendEmailVerificationDisabled
                                    ? `${sendEmailVerificationDisabledseconds}s`
                                    : t('Send verification code')}
                            </Button>
                        )
                    }
                    rightSectionWidth="fit-content"
                />
                <TextInput
                    label={t('Verification code')}
                    value={emailVerificationToken}
                    onChange={({ currentTarget: { value } }) => setEmailVerificationToken(value)}
                />
                <PasswordSetup value={password} onChange={setPassword} />

                <Button onClick={handleRegister} loading={isLoading} disabled={!areFieldsValid || isLoading}>
                    {t('Sign up')}
                </Button>
                <Button variant="default" onClick={() => props.setLoginState('login')} disabled={isLoading}>
                    {t('Back to log in')}
                </Button>
            </RMSectionBody>
        </RMSection>
    );
};

export default RegisterView;
