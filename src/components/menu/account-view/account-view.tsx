import { Divider, Flex, Heading, Stack } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootSelector } from '../../../redux';
import AccountInfo from './account-info';
import ForgotPasswordView from './forgot-password-view';
import LoginView from './login-view';
import RegisterView from './register-view';
import SavesSection from './saves-section';
import SubscriptionSection from './subscription-section';

const AccountView = () => {
    const { t } = useTranslation();
    const { isLoggedIn } = useRootSelector(state => state.account);

    const [loginState, setLoginState] = React.useState('login' as 'login' | 'register' | 'forgot-password');

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
                        <AccountInfo />
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
