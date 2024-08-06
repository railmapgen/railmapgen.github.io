import { Avatar, Button, Divider, Flex, HStack, Heading, Stack, Text } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { logout } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';
import ForgotPasswordView from './forgot-password-view';
import LoginView from './login-view';
import RegisterView from './register-view';
import SavesSection from './saves-section';
import SubscriptionSection from './subscription-section';

const AccountView = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isLoggedIn, name, refreshToken } = useRootSelector(state => state.account);

    const [loginState, setLoginState] = React.useState('login' as 'login' | 'register' | 'forgot-password');

    const handleLogOut = async () => {
        if (!isLoggedIn) return;
        await fetch(API_URL + API_ENDPOINT.AUTH_LOGOUT, {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
        });
        dispatch(logout());
    };

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Account')}
                </Heading>
            </RmgSectionHeader>

            {!isLoggedIn ? (
                loginState === 'login' ? (
                    <LoginView setLoginState={setLoginState} />
                ) : loginState === 'register' ? (
                    <RegisterView setLoginState={setLoginState} />
                ) : (
                    <ForgotPasswordView setLoginState={setLoginState} />
                )
            ) : (
                <Flex flexDirection="column" alignItems="center">
                    <Stack width="100%" p="2" spacing="30px">
                        <RmgSectionHeader width="100%">
                            <HStack width="100%">
                                <Avatar size="md" name={name} />
                                <Text as="b" fontSize="xl">
                                    {name}
                                </Text>
                                <Button size="sm" ml="auto" onClick={handleLogOut}>
                                    {t('Log out')}
                                </Button>
                            </HStack>
                        </RmgSectionHeader>
                        <Divider />
                        <SubscriptionSection />
                        <Divider />
                        <SavesSection />
                    </Stack>
                </Flex>
            )}
        </RmgSection>
    );
};

export default AccountView;
