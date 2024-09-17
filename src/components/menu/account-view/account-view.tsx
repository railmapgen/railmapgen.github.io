import { Divider, Flex, Heading, VStack } from '@chakra-ui/react';
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
        <RmgSection display="flex" flexDirection="column" h="100%" overflow="hidden">
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
                <Flex flexDirection="column" h="100%" overflow="hidden" bg="inherit">
                    <AccountInfo />
                    <Divider />
                    <VStack overflowY="auto" bg="inherit">
                        <SubscriptionSection />
                        <Divider />
                        <SavesSection />
                    </VStack>
                </Flex>
            )}
        </RmgSection>
    );
};

export default AccountView;
