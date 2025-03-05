import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';
import { emailValidator, passwordValidator } from './account-utils';
import { MdOutlineErrorOutline, MdOutlineInfo } from 'react-icons/md';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Alert, Button, TextInput, Title } from '@mantine/core';
import EmailInputWithOtp from './email-input-with-otp';
import PasswordSetup from './password-setup';
import { addNotification } from '../../../redux/notification/notification-slice';

const ForgotPasswordView = (props: { setLoginState: (_: 'login' | 'register' | 'forgot-password') => void }) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [resetPasswordToken, setResetPasswordToken] = useState('');
    const [emailResetPasswordSent, setEmailResetPasswordSent] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const isEmailValid = !!email && emailValidator(email);
    const areFieldsValid = isEmailValid && !!resetPasswordToken && !!password && passwordValidator(password);

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to reset your password'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const handleSendResetPasswordEmail = async () => {
        try {
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
            } else if (rep.status > 400) {
                setEmailResetPasswordSent('error');
            }
        } catch {
            setEmailResetPasswordSent('error');
        }
    };

    const handleResetPassword = async () => {
        setIsLoading(true);
        const resetPasswordParam = new URLSearchParams({ token: resetPasswordToken });
        const resetPasswordURL = `${API_URL}${API_ENDPOINT.AUTH_RESET_PASSWORD}?${resetPasswordParam.toString()}`;
        try {
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
                showErrorToast(error);
            } else {
                dispatch(
                    addNotification({
                        title: t('Welcome ') + username,
                        message: t('Your password has been reset successfully.'),
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
                    {t('Forgot password')}
                </Title>
            </RMSectionHeader>

            <RMSectionBody direction="column" gap="xs">
                {emailResetPasswordSent === 'error' && (
                    <Alert color="red" icon={<MdOutlineErrorOutline />} title={t('Check your email again!')} />
                )}
                {emailResetPasswordSent && emailResetPasswordSent !== 'error' && (
                    <Alert
                        color="blue"
                        icon={<MdOutlineInfo />}
                        title={t('Email with reset link is sent to') + ' ' + emailResetPasswordSent}
                    />
                )}

                <EmailInputWithOtp
                    value={email}
                    onChange={setEmail}
                    onVerify={handleSendResetPasswordEmail}
                    otpSent={emailResetPasswordSent}
                />
                <TextInput
                    label={t('Reset password token')}
                    value={resetPasswordToken}
                    onChange={({ currentTarget: { value } }) => setResetPasswordToken(value)}
                />
                <PasswordSetup value={password} onChange={setPassword} />

                <Button onClick={handleResetPassword} loading={isLoading} disabled={!areFieldsValid || isLoading}>
                    {t('Reset password')}
                </Button>
                <Button variant="default" onClick={() => props.setLoginState('login')} disabled={isLoading}>
                    {t('Back to log in')}
                </Button>
            </RMSectionBody>
        </RMSection>
    );
};

export default ForgotPasswordView;
