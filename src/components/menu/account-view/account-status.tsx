import { Avatar, Button, Text } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowForwardIos } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList } from '../../../redux/account/account-slice';
import { setMenuView } from '../../../redux/app/app-slice';

const AccountStatus = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isLoggedIn, name } = useRootSelector(state => state.account);

    React.useEffect(() => {
        if (!isLoggedIn) return;
        dispatch(fetchSaveList());
    }, [isLoggedIn]);

    return (
        <Button
            variant="ghost"
            onClick={() => dispatch(setMenuView('account'))}
            rightIcon={<MdArrowForwardIos />}
            aria-label="More account info"
            mx={2}
            px={3}
            py={8}
        >
            <Avatar
                name={isLoggedIn ? name : undefined}
                // TODO: use right avatar
                // src={isLoggedIn ? 'https://github.com/thekingofcity.png?size=100' : undefined}
            />
            <Text as="b" ml={2} mr="auto">
                {isLoggedIn ? name : t('Log in / Sign up')}
            </Text>
        </Button>
    );
};

export default AccountStatus;
