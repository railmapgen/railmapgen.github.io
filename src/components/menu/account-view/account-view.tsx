import classes from './account-view.module.css';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { AccountPage, setAccountPage } from '../../../redux/app/app-slice';
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

    const dispatch = useRootDispatch();
    const loginState = useRootSelector(state => state.app.accountPage);
    const setLoginState = (page: AccountPage) => dispatch(setAccountPage(page));

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
