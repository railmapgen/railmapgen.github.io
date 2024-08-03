import { Avatar, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { logout } from '../../../redux/account/account-slice';
import { API_ENDPOINT, API_URL } from '../../../util/constants';
import LoginView from './login-view';
import RegisterView from './register-view';
import SavesSection from './saves-section';
import SubscriptionSection from './subscription-section';

const AccountView = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isLoggedIn, name, refreshToken } = useRootSelector(state => state.account);

    const [loginOrRegister, setLoginOrRegister] = React.useState('login' as 'login' | 'register');

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
                loginOrRegister === 'login' ? (
                    <LoginView setLoginOrRegister={setLoginOrRegister} />
                ) : (
                    <RegisterView setLoginOrRegister={setLoginOrRegister} />
                )
            ) : (
                <Flex flexDirection="column" alignItems="center">
                    <Avatar size="xl" name={name} src="https://github.com/thekingofcity.png?size=200" />
                    <Text as="b" fontSize="xl">
                        {name}
                    </Text>
                    <Button onClick={handleLogOut}>{t('Log out')}</Button>

                    <SubscriptionSection />
                    <SavesSection />
                </Flex>
            )}
        </RmgSection>
    );
};

export default AccountView;
