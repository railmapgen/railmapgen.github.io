import { ActionIcon, Button, Card, Group, Text, Title } from '@mantine/core';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { logger } from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDeleteOutline, MdOutlineShare, MdOutlineSync, MdOutlineSyncAlt } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList, logout, syncAfterLogin } from '../../../redux/account/account-slice';
import { addNotification } from '../../../redux/notification/notification-slice';
import { clearBaseSync, setBaseSync } from '../../../redux/rmp-save/rmp-save-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT, APISaveList, SAVE_KEY } from '../../../util/constants';
import { getRMPSave, notifyRMPSaveChange, setRMPSave } from '../../../util/local-storage-save';
import { getRandomCityName } from '../../../util/random-save-name';
import { resolveBoundSaveId } from '../../../util/rmp-sync';
import InlineEdit from '../../common/inline-edit';
import ShareModal from './share-modal';

const MAXIMUM_FREE_SAVE = 1;
const MAXIMUM_SAVE = 10;

const SavesSection = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        isLoggedIn,
        id: userId,
        token,
        activeSubscriptions,
        currentSaveId,
        saves: saveList,
    } = useRootSelector(state => state.account);
    const { baseUserId, baseSaveId } = useRootSelector(state => state.rmpSave);

    const localCurrentSaveId = resolveBoundSaveId({
        currentUserId: userId,
        currentSaveId,
        saves: saveList,
        baseUserId,
        baseSaveId,
    });

    const canCreateNewSave =
        isLoggedIn &&
        saveList &&
        (activeSubscriptions.RMP_CLOUD ? saveList.length < MAXIMUM_SAVE : saveList.length < MAXIMUM_FREE_SAVE);
    const firstSaveIdIfSubscriptionIsExpired = Math.min(...(saveList ?? []).map(s => s.id));
    const isUpdateDisabled = (saveId: number) =>
        !activeSubscriptions.RMP_CLOUD && saveId !== firstSaveIdIfSubscriptionIsExpired;

    const [syncButtonIsLoading, setSyncButtonIsLoading] = React.useState(undefined as number | undefined);
    const [deleteButtonIsLoading, setDeleteButtonIsLoading] = React.useState(undefined as number | undefined);
    const [shareModalOpened, setShareModalOpened] = React.useState(false);
    const [shareSaveID, setShareSaveID] = React.useState<number | undefined>(undefined);

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to sync your save'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const handleCreateNewSave = async () => {
        const save = await getRMPSave(SAVE_KEY.RMP);
        if (!isLoggedIn || !save || !token || !userId) {
            showErrorToast(t('Failed to get the RMP save!'));
            return;
        }
        const { data, hash } = save;
        const index = getRandomCityName();
        try {
            const rep = await apiFetch(
                API_ENDPOINT.SAVES,
                {
                    method: 'POST',
                    body: JSON.stringify({ index, data, hash }),
                },
                token
            );
            if (rep.status === 401) {
                showErrorToast(t('Login status expired.'));
                dispatch(logout());
                return;
            }
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                return;
            }

            const savesRep = await dispatch(fetchSaveList());
            if (savesRep.meta.requestStatus === 'fulfilled') {
                const payload = savesRep.payload as APISaveList;
                if (payload.currentSaveId) {
                    dispatch(setBaseSync({ userId, saveId: payload.currentSaveId, hash }));
                }
            }
        } catch (e) {
            showErrorToast((e as Error).message);
        }
    };

    const handleSync = async (saveId: number) => {
        if (!isLoggedIn || !token || !userId) return;

        if (saveId === localCurrentSaveId) {
            setSyncButtonIsLoading(saveId);
            if (isUpdateDisabled(saveId)) {
                showErrorToast(t('Can not sync this save!'));
                setSyncButtonIsLoading(undefined);
                return;
            }

            const rep = await dispatch(syncAfterLogin());
            if (rep.meta.requestStatus === 'rejected' && rep.payload) {
                showErrorToast(String(rep.payload));
            }
            setSyncButtonIsLoading(undefined);
            return;
        }

        setSyncButtonIsLoading(saveId);
        const saveInfo = saveList.find(save => save.id === saveId);
        const rep = await apiFetch(API_ENDPOINT.SAVES + '/' + saveId, {}, token);
        if (rep.status === 401) {
            showErrorToast(t('Login status expired.'));
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
        if (saveInfo) {
            dispatch(setBaseSync({ userId, saveId, hash: saveInfo.hash }));
        }
        notifyRMPSaveChange();
        setSyncButtonIsLoading(undefined);
        dispatch(fetchSaveList());
    };

    const handleDeleteSave = async (saveId: number) => {
        if (!isLoggedIn || !saveId || !token || !userId) return;
        const isDeletingBoundSave = saveId === localCurrentSaveId;

        setDeleteButtonIsLoading(saveId);
        const rep = await apiFetch(API_ENDPOINT.SAVES + '/' + saveId, { method: 'DELETE' }, token);
        if (rep.status === 401) {
            showErrorToast(t('Login status expired.'));
            setDeleteButtonIsLoading(undefined);
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            setDeleteButtonIsLoading(undefined);
            return;
        }

        const savesRep = await dispatch(fetchSaveList());
        if (savesRep.meta.requestStatus !== 'fulfilled') {
            setDeleteButtonIsLoading(undefined);
            return;
        }

        if (!isDeletingBoundSave) {
            setDeleteButtonIsLoading(undefined);
            return;
        }

        const payload = savesRep.payload as APISaveList;
        const replacementSaveId = payload.currentSaveId;
        const replacementSave = payload.saves.find(save => save.id === replacementSaveId);

        if (!replacementSaveId || !replacementSave) {
            dispatch(clearBaseSync());
            setDeleteButtonIsLoading(undefined);
            return;
        }

        const replacementRep = await apiFetch(API_ENDPOINT.SAVES + '/' + replacementSaveId, {}, token);
        if (replacementRep.status === 401) {
            showErrorToast(t('Login status expired.'));
            dispatch(logout());
            setDeleteButtonIsLoading(undefined);
            return;
        }
        if (replacementRep.status !== 200) {
            showErrorToast(await replacementRep.text());
            dispatch(clearBaseSync());
            setDeleteButtonIsLoading(undefined);
            return;
        }

        logger.info(`Set ${SAVE_KEY.RMP} with replacement save id: ${replacementSaveId}`);
        setRMPSave(SAVE_KEY.RMP, await replacementRep.text());
        dispatch(setBaseSync({ userId, saveId: replacementSaveId, hash: replacementSave.hash }));
        notifyRMPSaveChange();
        setDeleteButtonIsLoading(undefined);
    };

    const handleEditSaveName = async (saveId: number, newName: string) => {
        if (!isLoggedIn || !saveId || !token) return;
        const rep = await apiFetch(
            `${API_ENDPOINT.SAVES}/${saveId}/metadata`,
            { method: 'PATCH', body: JSON.stringify({ index: newName }) },
            token
        );
        if (rep.status === 401) {
            showErrorToast(t('Login status expired.'));
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        dispatch(fetchSaveList());
    };

    const handleOpenShareModal = (saveID: number) => {
        setShareSaveID(saveID);
        setShareModalOpened(true);
    };

    return (
        <RMSection>
            <RMSectionHeader align="center">
                <Title order={3} size="h5" flex="1">
                    {t('Synced saves')}
                </Title>
                <Button variant="subtle" size="xs" ml="xs" disabled={!canCreateNewSave} onClick={handleCreateNewSave}>
                    {canCreateNewSave ? t('Create') : t('Subscribe to sync more')}
                </Button>
            </RMSectionHeader>

            <RMSectionBody direction="column" gap="xs">
                {saveList?.map(save => (
                    <Card key={save.id} withBorder shadow="sm">
                        <Group>
                            <InlineEdit
                                initialValue={save.index}
                                onSave={val => handleEditSaveName(save.id, val)}
                                textInputWidth="177px"
                            />
                            <ActionIcon
                                disabled={isUpdateDisabled(save.id)}
                                loading={syncButtonIsLoading === save.id}
                                onClick={() => handleSync(save.id)}
                                title={save.id === localCurrentSaveId ? t('Sync now') : t('Sync this slot')}
                            >
                                {save.id === localCurrentSaveId ? <MdOutlineSync /> : <MdOutlineSyncAlt />}
                            </ActionIcon>
                            <ActionIcon onClick={() => handleOpenShareModal(save.id)} title={t('Share')}>
                                <MdOutlineShare />
                            </ActionIcon>
                            <ActionIcon
                                color="red"
                                loading={deleteButtonIsLoading === save.id}
                                onClick={() => handleDeleteSave(save.id)}
                                title={t('Delete')}
                            >
                                <MdDeleteOutline />
                            </ActionIcon>
                        </Group>
                        <Group justify="space-between" mt="md" mb="md">
                            <Text>
                                {t('ID')}: {save.id}
                            </Text>
                            <Text>
                                {t('Status')}: {save.id === localCurrentSaveId ? t('Current save') : t('Cloud save')}
                            </Text>
                        </Group>
                        <Text>
                            {t('Last update at')}: {new Date(save.lastUpdateAt).toLocaleString()}
                        </Text>
                    </Card>
                ))}
            </RMSectionBody>
            <ShareModal
                opened={shareModalOpened}
                onClose={() => setShareModalOpened(false)}
                shareSaveInfo={saveList?.find(save => save.id === shareSaveID)}
            />
        </RMSection>
    );
};

export default SavesSection;
