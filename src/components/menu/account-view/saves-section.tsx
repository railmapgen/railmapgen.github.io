import { Button, Card, CardBody, CardFooter, HStack, Heading, Stack, Text, useToast } from '@chakra-ui/react';
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

    const [syncButtonIsLoading, setSyncButtonIsLoading] = React.useState(undefined as number | undefined);
    const [deleteButtonIsLoading, setDeleteButtonIsLoading] = React.useState(undefined as number | undefined);

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
        const index = crypto.randomUUID();
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(
            API_ENDPOINT.SAVES,
            {
                method: 'POST',
                body: JSON.stringify({ index, data, hash }),
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
            setSyncButtonIsLoading(currentSaveId);
            if (!currentSaveId || isUpdateDisabled(currentSaveId)) {
                showErrorToast(t('Can not sync this save!'));
                setSyncButtonIsLoading(undefined);
                return;
            }
            const save = await getRMPSave(SAVE_KEY.RMP);
            if (!save) {
                showErrorToast(t('Failed to get the RMP save!'));
                setSyncButtonIsLoading(undefined);
                return;
            }
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
                setSyncButtonIsLoading(undefined);
                return;
            }
            dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                setSyncButtonIsLoading(undefined);
                return;
            }
            setSyncButtonIsLoading(undefined);
        } else {
            // sync another save slot
            setSyncButtonIsLoading(saveId);
            const {
                rep,
                token: updatedToken,
                refreshToken: updatedRefreshToken,
            } = await apiFetch(API_ENDPOINT.SAVES + '/' + saveId, {}, token, refreshToken);
            if (!updatedRefreshToken || !updatedToken) {
                showErrorToast(t('Login status expired'));
                setSyncButtonIsLoading(undefined);
                return;
            }
            dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                setSyncButtonIsLoading(undefined);
                return;
            }
            logger.info(`Set ${SAVE_KEY.RMP} with save id: ${saveId}`);
            setRMPSave(SAVE_KEY.RMP, await rep.text());
            notifyRMPSaveChange();
            setSyncButtonIsLoading(undefined);
        }
        dispatch(fetchSaveList());
    };
    const handleDeleteSave = async (saveId: number) => {
        if (!isLoggedIn || !saveId || !token) return;
        setDeleteButtonIsLoading(saveId);
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await apiFetch(API_ENDPOINT.SAVES + '/' + currentSaveId, { method: 'DELETE' }, token, refreshToken);
        if (!updatedRefreshToken || !updatedToken) {
            showErrorToast(t('Login status expired'));
            setDeleteButtonIsLoading(undefined);
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            setDeleteButtonIsLoading(undefined);
            return;
        }
        dispatch(fetchSaveList());
        setDeleteButtonIsLoading(undefined);
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
                <HStack width="100%">
                    <Heading as="h4" size="md" my={1}>
                        {t('Synced saves')}
                    </Heading>
                    <Text ml="auto">
                        {t('Maximum save count:')} {activeSubscriptions.RMP_CLOUD ? 10 : 1}
                    </Text>
                    <Button size="sm" isDisabled={!canCreateNewSave} onClick={handleCreateNewSave}>
                        {t('Create')}
                    </Button>
                </HStack>
            </RmgSectionHeader>

            <Stack mt="2">
                {saveList &&
                    saveList.map(_ => (
                        <Card key={_.id} overflow="hidden" variant="outline" mb="3">
                            <Stack direction={{ base: 'column', sm: 'row' }}>
                                <CardBody>
                                    <Text py="2" as="b">
                                        {_.id === currentSaveId ? t('Current save') : t('Cloud save')}
                                    </Text>
                                    <Text py="2">
                                        {t('Last update at:')} {new Date(_.lastUpdateAt).toLocaleString()}
                                    </Text>
                                </CardBody>
                                <CardFooter>
                                    <Stack>
                                        <Button
                                            variant="solid"
                                            colorScheme="red"
                                            isLoading={deleteButtonIsLoading === _.id}
                                            onClick={() => handleDeleteSave(_.id)}
                                        >
                                            {t('Delete this save')}
                                        </Button>
                                        <Button
                                            variant="solid"
                                            colorScheme="blue"
                                            isDisabled={isUpdateDisabled(_.id)}
                                            isLoading={syncButtonIsLoading === _.id}
                                            onClick={() => handleSync(_.id)}
                                        >
                                            {_.id === currentSaveId ? t('Sync now') : t('Sync this slot')}
                                        </Button>
                                    </Stack>
                                </CardFooter>
                            </Stack>
                        </Card>
                    ))}
            </Stack>
        </RmgSection>
    );
};

export default SavesSection;
