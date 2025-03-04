import { useToast } from '@chakra-ui/react';
import { logger } from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList, logout, syncAfterLogin } from '../../../redux/account/account-slice';
import { setLastChangedAtTimeStamp } from '../../../redux/rmp-save/rmp-save-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT, APISaveList, SAVE_KEY } from '../../../util/constants';
import { getRMPSave, notifyRMPSaveChange, setRMPSave } from '../../../util/local-storage-save';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { Button, Card, Stack, Text, Title } from '@mantine/core';

const MAXIMUM_FREE_SAVE = 1;
const MAXIMUM_SAVE = 10;

const SavesSection = () => {
    const toast = useToast();
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        isLoggedIn,
        token,
        activeSubscriptions,
        currentSaveId,
        saves: saveList,
    } = useRootSelector(state => state.account);
    const { lastChangedAtTimeStamp } = useRootSelector(state => state.rmpSave);

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
        const rep = await apiFetch(
            API_ENDPOINT.SAVES,
            {
                method: 'POST',
                body: JSON.stringify({ index, data, hash }),
            },
            token
        );
        if (!rep) {
            showErrorToast(t('Login status expired'));
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        dispatch(fetchSaveList());
    };
    const handleSync = async (saveId: number) => {
        if (!isLoggedIn || !token) return;
        if (saveId === currentSaveId) {
            // current sync, either fetch cloud (a) or update cloud (b)
            setSyncButtonIsLoading(currentSaveId);
            if (!currentSaveId || isUpdateDisabled(currentSaveId)) {
                showErrorToast(t('Can not sync this save!'));
                setSyncButtonIsLoading(undefined);
                return;
            }

            // fetch cloud save metadata
            const savesRep = await dispatch(fetchSaveList());
            if (savesRep.meta.requestStatus !== 'fulfilled') {
                showErrorToast(t('Login status expired')); // TODO: also might be !200 response
                setSyncButtonIsLoading(undefined);
                return;
            }
            const savesList = savesRep.payload as APISaveList;
            const cloudSave = savesList.saves.filter(save => save.id === currentSaveId).at(0);
            if (!cloudSave) {
                showErrorToast(t(`Current save id is not in saveList!`));
                // TODO: ask sever to reconstruct currentSaveId
                setSyncButtonIsLoading(undefined);
                return;
            }
            const lastUpdateAt = new Date(cloudSave.lastUpdateAt);
            const lastChangedAt = new Date(lastChangedAtTimeStamp);
            // a. if cloud save is newer, fetch and set the cloud save to local
            if (lastChangedAt < lastUpdateAt) {
                logger.warn(`Save id: ${currentSaveId} is newer in the cloud via local compare.`);
                // TODO: There is no compare just fetch and set the cloud save to local
                // might be better to have a dedicated thunk action for this
                dispatch(syncAfterLogin());
                setSyncButtonIsLoading(undefined);
                return;
            }

            // b. local save is newer, update the cloud save
            const save = await getRMPSave(SAVE_KEY.RMP);
            if (!save) {
                showErrorToast(t('Failed to get the RMP save!'));
                setSyncButtonIsLoading(undefined);
                return;
            }
            const { data, hash } = save;
            const rep = await apiFetch(
                API_ENDPOINT.SAVES + '/' + currentSaveId,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ data, hash }),
                },
                token
            );
            if (!rep) {
                showErrorToast(t('Login status expired'));
                setSyncButtonIsLoading(undefined);
                dispatch(logout());
                return;
            }
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                setSyncButtonIsLoading(undefined);
                return;
            }
            setSyncButtonIsLoading(undefined);
        } else {
            // sync another save slot
            setSyncButtonIsLoading(saveId);
            const rep = await apiFetch(API_ENDPOINT.SAVES + '/' + saveId, {}, token);
            if (!rep) {
                showErrorToast(t('Login status expired'));
                setSyncButtonIsLoading(undefined);
                dispatch(logout());
                return;
            }
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                setSyncButtonIsLoading(undefined);
                return;
            }
            logger.info(`Set ${SAVE_KEY.RMP} with save id: ${saveId}`);
            setRMPSave(SAVE_KEY.RMP, await rep.text());
            dispatch(setLastChangedAtTimeStamp(new Date().valueOf()));
            notifyRMPSaveChange();
            setSyncButtonIsLoading(undefined);
        }
        dispatch(fetchSaveList());
    };
    const handleDeleteSave = async (saveId: number) => {
        if (!isLoggedIn || !saveId || !token) return;
        setDeleteButtonIsLoading(saveId);
        const rep = await apiFetch(API_ENDPOINT.SAVES + '/' + currentSaveId, { method: 'DELETE' }, token);
        if (!rep) {
            showErrorToast(t('Login status expired'));
            setDeleteButtonIsLoading(undefined);
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            setDeleteButtonIsLoading(undefined);
            return;
        }
        dispatch(fetchSaveList());
        setDeleteButtonIsLoading(undefined);
    };

    return (
        <RMSection>
            <RMSectionHeader align="center">
                <Title order={3} size="h5">
                    {t('Synced saves')}
                </Title>
                <Text ml="auto" size="sm">
                    {t('Maximum save count:')} {activeSubscriptions.RMP_CLOUD ? 10 : 1}
                </Text>
                <Button variant="subtle" size="xs" ml="xs" disabled={!canCreateNewSave} onClick={handleCreateNewSave}>
                    {t('Create')}
                </Button>
            </RMSectionHeader>

            <RMSectionBody direction="column" gap="xs">
                {saveList?.map(_ => (
                    <Card key={_.id} withBorder shadow="sm" style={{ flexDirection: 'row' }}>
                        <Stack gap="xs" flex={1}>
                            <Text fw={500}>{_.id === currentSaveId ? t('Current save') : t('Cloud save')}</Text>
                            <Text>
                                {t('Last update at:')} {new Date(_.lastUpdateAt).toLocaleString()}
                            </Text>
                        </Stack>
                        <Stack gap="xs" ml="xs">
                            <Button
                                variant="filled"
                                color="red"
                                loading={deleteButtonIsLoading === _.id}
                                onClick={() => handleDeleteSave(_.id)}
                            >
                                {t('Delete this save')}
                            </Button>
                            <Button
                                variant="filled"
                                disabled={isUpdateDisabled(_.id)}
                                loading={syncButtonIsLoading === _.id}
                                onClick={() => handleSync(_.id)}
                            >
                                {_.id === currentSaveId ? t('Sync now') : t('Sync this slot')}
                            </Button>
                        </Stack>
                    </Card>
                ))}
            </RMSectionBody>
        </RMSection>
    );
};

export default SavesSection;
