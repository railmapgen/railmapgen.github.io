import { Button, Flex, Heading, Link, Stack, useToast } from '@chakra-ui/react';
import { RmgFields, RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { fetchLogin } from '../../../redux/account/account-slice';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const emailValidator = (value: string) => !!value.match(EMAIL_REGEX);

const LoginView = (props: { setLoginState: (_: 'login' | 'register' | 'forgot-password') => void }) => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const areFieldsValid = !!email && emailValidator(email) && !!password;

    const handleLogIn = async () => {
        setIsLoading(true);
        try {
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
                    {t('Log in')}
                </Heading>
            </RmgSectionHeader>

            <Flex px={2} flexDirection="column">
                <RmgFields
                    fields={[
                        {
                            label: t('Email'),
                            type: 'input',
                            variant: 'email',
                            value: email,
                            onChange: setEmail,
                            validator: emailValidator,
                            debouncedDelay: 0,
                        },
                        {
                            label: t('Password'),
                            type: 'input',
                            variant: 'password',
                            value: password,
                            onChange: setPassword,
                            debouncedDelay: 0,
                        },
                    ]}
                    minW="full"
                />
                <Link as="button" fontSize="sm" onClick={() => props.setLoginState('forgot-password')} ml="auto">
                    {t('Forgot password') + '?'}
                </Link>

                <Stack mt={1}>
                    <Button
                        colorScheme="primary"
                        onClick={handleLogIn}
                        isLoading={isLoading}
                        isDisabled={!areFieldsValid || isLoading}
                    >
                        {t('Log in')}
                    </Button>
                    <Button onClick={() => props.setLoginState('register')} isDisabled={isLoading}>
                        {t('Create an account')}
                    </Button>
                </Stack>
            </Flex>
        </RmgSection>
    );
};

export default LoginView;
