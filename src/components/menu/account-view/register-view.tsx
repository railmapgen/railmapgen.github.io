import { Alert, Button, TextInput, Title } from '@mantine/core';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineErrorOutline, MdOutlineInfo } from 'react-icons/md';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';
import { addNotification } from '../../../redux/notification/notification-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT } from '../../../util/constants';
import { emailValidator, passwordValidator } from './account-utils';
import EmailInputWithOtp from './email-input-with-otp';
import PasswordSetup from './password-setup';

const RegisterView = (props: { setLoginState: (_: 'login' | 'register') => void }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailVerificationToken, setEmailVerificationToken] = useState('');
    const [emailVerificationSent, setEmailVerificationSent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isEmailValid = !!email && emailValidator(email);
    const areFieldsValid =
        !!name && isEmailValid && !!emailVerificationToken && !!password && passwordValidator(password);

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to create your account'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const handleVerifyEmail = async () => {
        try {
            const rep = await apiFetch(API_ENDPOINT.AUTH_SEND_VERIFICATION_EMAIL, {
                method: 'POST',
                body: JSON.stringify({ email }),
            });
            if (rep.status === 204) {
                setEmailVerificationSent(email);
            } else if (rep.status > 400) {
                setEmailVerificationSent('error');
            }
        } catch {
            setEmailVerificationSent('error');
        }
    };

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            const registerRep = await apiFetch(API_ENDPOINT.AUTH_REGISTER, {
                method: 'POST',
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
                showErrorToast(error);
            } else {
                dispatch(
                    addNotification({
                        title: t('Welcome ') + username,
                        message: t('Your account is created successfully.'),
                        type: 'success',
                        duration: 5000,
                    })
                );
            }
        } catch (e) {
            showErrorToast((e as Error).message);
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
                <EmailInputWithOtp
                    description={t("We'll never share your email.")}
                    value={email}
                    onChange={setEmail}
                    onVerify={handleVerifyEmail}
                    otpSent={emailVerificationSent}
                    allowResendOtp
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
