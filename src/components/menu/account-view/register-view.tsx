import { useState } from 'react';
import {
    Alert,
    AlertDescription,
    AlertIcon,
    Button,
    Flex,
    Heading,
    InputGroup,
    InputRightElement,
    Stack,
    Text,
    useToast,
} from '@chakra-ui/react';
import { RmgDebouncedInput, RmgFields, RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';
import { emailValidator, passwordValidator } from './account-utils';
import { MdCheck } from 'react-icons/md';

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
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Create an account')}
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

            <Flex px={2} flexDirection="column">
                <RmgFields
                    fields={[
                        {
                            label: t('Name'),
                            type: 'input',
                            value: name,
                            onChange: setName,
                            debouncedDelay: 0,
                            helper: t('You may always change it later.'),
                        },
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
                                        {emailVerificationSent ? (
                                            <>
                                                <MdCheck />
                                                <Text fontSize="xs" ml={1}>
                                                    {t('Verification code sent')}
                                                </Text>
                                            </>
                                        ) : (
                                            <Button size="xs" onClick={handleVerifyEmail} isDisabled={!isEmailValid}>
                                                {t('Send verification code')}
                                            </Button>
                                        )}
                                    </InputRightElement>
                                </InputGroup>
                            ),
                            helper: t("We'll never share your email."),
                        },
                        {
                            label: t('Verification code'),
                            type: 'input',
                            variant: 'number',
                            value: emailVerificationToken,
                            onChange: setEmailVerificationToken,
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
                            helper: t('Mininum 8 characters. Contain at least 1 letter and 1 number.'),
                        },
                    ]}
                    minW="full"
                />

                <Stack mt={1}>
                    <Button
                        colorScheme="primary"
                        onClick={handleRegister}
                        isLoading={isLoading}
                        isDisabled={!areFieldsValid || isLoading}
                    >
                        {t('Sign up')}
                    </Button>
                    <Button onClick={() => props.setLoginState('login')} isDisabled={isLoading}>
                        {t('Back to log in')}
                    </Button>
                </Stack>
            </Flex>
        </RmgSection>
    );
};

export default RegisterView;
