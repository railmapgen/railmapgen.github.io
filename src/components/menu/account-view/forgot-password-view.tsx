import { Button, Flex, InputGroup, InputRightElement, Stack, Text, useToast } from '@chakra-ui/react';
import { RmgDebouncedInput, RmgFields } from '@railmapgen/rmg-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';
import { emailValidator, passwordValidator } from './account-utils';
import { MdCheck, MdOutlineErrorOutline, MdOutlineInfo } from 'react-icons/md';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Alert, Title } from '@mantine/core';

const ForgotPasswordView = (props: { setLoginState: (_: 'login' | 'register' | 'forgot-password') => void }) => {
    const toast = useToast();
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
            </RMSectionBody>

            <Flex p={2} flexDirection="column">
                <RmgFields
                    fields={[
                        {
                            label: t('Email'),
                            type: 'custom',
                            component: (
                                <InputGroup size="sm">
                                    <RmgDebouncedInput
                                        type="email"
                                        value={email}
                                        onDebouncedChange={setEmail}
                                        delay={0}
                                        validator={emailValidator}
                                    />
                                    <InputRightElement width="auto" bottom={0} top="unset">
                                        {emailResetPasswordSent ? (
                                            <>
                                                <MdCheck />
                                                <Text fontSize="xs" ml={1}>
                                                    {t('Reset link sent')}
                                                </Text>
                                            </>
                                        ) : (
                                            <Button
                                                size="xs"
                                                onClick={handleSendResetPasswordEmail}
                                                isDisabled={!isEmailValid}
                                            >
                                                {t('Send reset link')}
                                            </Button>
                                        )}
                                    </InputRightElement>
                                </InputGroup>
                            ),
                        },
                        {
                            label: t('Reset password token'),
                            type: 'input',
                            value: resetPasswordToken,
                            onChange: setResetPasswordToken,
                            debouncedDelay: 0,
                        },
                        {
                            label: t('Password'),
                            type: 'input',
                            variant: 'password',
                            value: password,
                            onChange: setPassword,
                            debouncedDelay: 0,
                            validator: passwordValidator,
                            helper: t('Minimum 8 characters. Contain at least 1 letter and 1 number.'),
                        },
                    ]}
                    minW="full"
                />

                <Stack mt={1}>
                    <Button
                        colorScheme="primary"
                        onClick={handleResetPassword}
                        isLoading={isLoading}
                        isDisabled={!areFieldsValid || isLoading}
                    >
                        {t('Reset password')}
                    </Button>
                    <Button onClick={() => props.setLoginState('login')} isDisabled={isLoading}>
                        {t('Back to log in')}
                    </Button>
                </Stack>
            </Flex>
        </RMSection>
    );
};

export default ForgotPasswordView;
