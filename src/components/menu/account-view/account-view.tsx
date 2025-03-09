import classes from './account-view.module.css';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRootSelector } from '../../../redux';
import AccountInfo from './account-info';
import ForgotPasswordView from './forgot-password-view';
import LoginView from './login-view';
import RegisterView from './register-view';
import SavesSection from './saves-section';
import SubscriptionSection from './subscription-section';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Divider, Title } from '@mantine/core';

const AccountView = () => {
    const { t } = useTranslation();
    const { isLoggedIn } = useRootSelector(state => state.account);

    const [loginState, setLoginState] = useState<'login' | 'register' | 'forgot-password'>('login');

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    {t('Account')}
                </Title>
            </RMSectionHeader>

            {!isLoggedIn ? (
                loginState === 'login' ? (
                    <LoginView setLoginState={setLoginState} />
                ) : loginState === 'register' ? (
                    <RegisterView setLoginState={setLoginState} />
                ) : (
                    <ForgotPasswordView setLoginState={setLoginState} />
                )
            ) : (
                <RMSectionBody className={classes.body}>
                    <AccountInfo />
                    <Divider />
                    <SubscriptionSection />
                    <SavesSection />
                </RMSectionBody>
            )}
        </RMSection>
    );
};

export default AccountView;
