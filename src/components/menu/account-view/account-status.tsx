import { Avatar, Box, Flex, IconButton, Text } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowForwardIos } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList } from '../../../redux/account/account-slice';
import { setMenuView } from '../../../redux/app/app-slice';

const AccountStatus = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isLoggedIn, name, token } = useRootSelector(state => state.account);

    React.useEffect(() => {
        if (isLoggedIn && token) dispatch(fetchSaveList());
    }, [isLoggedIn]);

    return (
        <Flex p="1" flexDirection="row">
            <Avatar
                name={isLoggedIn ? name : undefined}
                // TODO: use right avatar
                // src={isLoggedIn ? 'https://github.com/thekingofcity.png?size=100' : undefined}
            />
            <Box ml="3" alignContent="center">
                <Text as="b">{isLoggedIn ? name : t('Log in / Sign up')}</Text>
            </Box>
            <Box ml="auto" alignContent="center">
                <IconButton
                    aria-label="More account info"
                    variant="ghost"
                    size="md"
                    onClick={() => dispatch(setMenuView('account'))}
                    icon={<MdArrowForwardIos />}
                />
            </Box>
        </Flex>
    );
};

export default AccountStatus;
