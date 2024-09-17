import { Avatar, Button, Text, useToast } from '@chakra-ui/react';
import { logger } from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdArrowForwardIos } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList, setToken } from '../../../redux/account/account-slice';
import { setMenuView } from '../../../redux/app/app-slice';
import { API_ENDPOINT, SAVE_KEY } from '../../../util/constants';
import { getRMPSave, notifyRMPSaveChange, setRMPSave } from '../../../util/local-storage-save';
import { apiFetch } from '../../../util/utils';

const AccountStatus = () => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { isLoggedIn, name, token, refreshToken, saves, currentSaveId } = useRootSelector(state => state.account);

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    React.useEffect(() => {
        if (!isLoggedIn) return;
        dispatch(fetchSaveList());
    }, [isLoggedIn]);

    // Below: Set RMP save with cloud latest on logged in

    React.useEffect(() => {
        if (!currentSaveId) return;
        checkIfRMPSaveNeedsUpdated();
    }, [currentSaveId]);

    const checkIfRMPSaveNeedsUpdated = async () => {
        const save = await getRMPSave(SAVE_KEY.RMP);
        if (!save) {
            setRMPSaveWithCloudLatest();
            return;
        }
        const { hash: localHash } = save;
        const cloudHash = saves.filter(save => save.id === currentSaveId).at(0)?.hash;
        if (!cloudHash) return;
        if (cloudHash !== localHash) {
            setRMPSaveWithCloudLatest();
        }
    };

    const setRMPSaveWithCloudLatest = async () => {
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SAVES + '/' + currentSaveId, {}, token, refreshToken);
        if (!updatedRefreshToken || !updatedToken) {
            showErrorToast(t('Login status expired'));
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        logger.info(`Set ${SAVE_KEY.RMP} with save id: ${currentSaveId}`);
        setRMPSave(SAVE_KEY.RMP, await rep.text());
        notifyRMPSaveChange();
    };

    // Above: Set RMP save with cloud latest on logged in

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
