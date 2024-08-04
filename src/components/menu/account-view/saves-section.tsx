import { Button, Card, CardBody, CardFooter, CardHeader, Heading, Stack, Text, useToast } from '@chakra-ui/react';
import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { logger } from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList, setToken } from '../../../redux/account/account-slice';
import { API_ENDPOINT, SAVE_KEY } from '../../../util/constants';
import { getRMPSave, notifyRMPSaveChange, setRMPSave } from '../../../util/local-storage-save';
import { apiFetch } from '../../../util/utils';

const MAXIMUM_FREE_SAVE = 1;
const MAXIMUM_SAVE = 10;

const SavesSection = () => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        isLoggedIn,
        token,
        refreshToken,
        activeSubscriptions,
        currentSaveId,
        saves: saveList,
    } = useRootSelector(state => state.account);

    const canCreateNewSave =
        isLoggedIn &&
        saveList &&
        (activeSubscriptions.RMP_CLOUD ? saveList.length < MAXIMUM_SAVE : saveList.length < MAXIMUM_FREE_SAVE);
    const firstSaveIdIfSubscriptionIsExpired = Math.min(...(saveList ?? []).map(s => s.id));
    const isUpdateDisabled = (saveId: number) =>
        !activeSubscriptions.RMP_CLOUD && saveId !== firstSaveIdIfSubscriptionIsExpired;

    const showErrorToast = (msg: string) =>
        toast({
            title: msg,
            status: 'error' as const,
            duration: 9000,
            isClosable: true,
        });

    const handleCreateNewSave = async () => {
        const save = await getRMPSave(SAVE_KEY.RMP);
        if (!isLoggedIn || !save || !token) {
            showErrorToast(t('Failed to get the RMP save!'));
            return;
        }
        const { data, hash } = save;
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(
            API_ENDPOINT.SAVES,
            {
                method: 'POST',
                body: JSON.stringify({ index: saveList.length.toString(), data, hash }),
            },
            token,
            refreshToken
        );
        if (!updatedRefreshToken || !updatedToken) {
            showErrorToast(t('Login status expired'));
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        dispatch(fetchSaveList());
    };
    const handleSync = async (saveId: number) => {
        if (!isLoggedIn || !token) return;
        if (saveId === currentSaveId) {
            if (!currentSaveId || isUpdateDisabled(currentSaveId)) {
                showErrorToast(t('Failed to get the RMP save!'));
                return;
            }
            const save = await getRMPSave(SAVE_KEY.RMP);
            if (!save) return;
            const { data, hash } = save;
            const {
                rep,
                token: updatedToken,
                refreshToken: updatedRefreshToken,
            } = await apiFetch(
                API_ENDPOINT.SAVES + '/' + currentSaveId,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ data, hash }),
                },
                token,
                refreshToken
            );
            if (!updatedRefreshToken || !updatedToken) {
                showErrorToast(t('Login status expired'));
                return;
            }
            dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                return;
            }
        } else {
            // sync another save slot
            const {
                rep,
                token: updatedToken,
                refreshToken: updatedRefreshToken,
            } = await apiFetch(API_ENDPOINT.SAVES + '/' + saveId, {}, token, refreshToken);
            if (!updatedRefreshToken || !updatedToken) {
                showErrorToast(t('Login status expired'));
                return;
            }
            dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                return;
            }
            logger.info(`Set ${SAVE_KEY.RMP} with save id: ${saveId}`);
            setRMPSave(SAVE_KEY.RMP, await rep.text());
            notifyRMPSaveChange();
        }
        dispatch(fetchSaveList());
    };
    const handleDeleteSave = async (saveId: number) => {
        if (!isLoggedIn || !saveId || !token) return;
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SAVES + '/' + currentSaveId, { method: 'DELETE' }, token, refreshToken);
        if (!updatedRefreshToken || !updatedToken) {
            showErrorToast(t('Login status expired'));
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        dispatch(fetchSaveList());
    };

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
        const cloudHash = saveList.filter(save => save.id === currentSaveId).at(0)?.hash;
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
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h4" size="md" my={1}>
                    {t('Synced saves')}
                </Heading>
            </RmgSectionHeader>

            {saveList &&
                saveList.map(_ => (
                    <Card key={_.id} overflow="hidden" variant="outline" mb="3">
                        <CardHeader>
                            <Heading size="md">{t(_.index)}</Heading>
                        </CardHeader>
                        <Stack direction={{ base: 'column', sm: 'row' }}>
                            <CardBody>
                                <Text py="2">
                                    {t('Last update at:')} {new Date(_.lastUpdateAt).toLocaleString()}
                                </Text>
                            </CardBody>
                            <CardFooter>
                                <Stack>
                                    <Button variant="solid" colorScheme="red" onClick={() => handleDeleteSave(_.id)}>
                                        {t('Delete this save')}
                                    </Button>
                                    <Button
                                        variant="solid"
                                        colorScheme="blue"
                                        isDisabled={isUpdateDisabled(_.id)}
                                        onClick={() => handleSync(_.id)}
                                    >
                                        {_.id === currentSaveId ? t('Sync now') : t('Sync this slot')}
                                    </Button>
                                </Stack>
                            </CardFooter>
                        </Stack>
                    </Card>
                ))}

            <Button isDisabled={!canCreateNewSave} onClick={handleCreateNewSave}>
                {t('Create a new save')}
            </Button>
        </RmgSection>
    );
};

export default SavesSection;
