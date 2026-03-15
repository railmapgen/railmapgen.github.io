import classes from './resolve-conflict-modal.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineCloud, MdOutlineComputer } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchSaveList, logout, syncAfterLogin } from '../../redux/account/account-slice';
import { clearResolveConflictModal, setBaseSync } from '../../redux/rmp-save/rmp-save-slice';
import { SAVE_KEY } from '../../util/constants';
import { downloadAs } from '../../util/download';
import { getRMPSave, notifyRMPSaveChange, setRMPSave, updateSave } from '../../util/local-storage-save';
import { Button, Card, Flex, Group, Modal, Stack, Text } from '@mantine/core';

const ResolveConflictModal = () => {
    const { t } = useTranslation();
    const { id: userId, token } = useRootSelector(state => state.account);
    const {
        resolveConflictModal: { isOpen, saveId, cloudData, cloudHash },
    } = useRootSelector(state => state.rmpSave);
    const dispatch = useRootDispatch();

    const [replaceCloudWithLocalLoading, setReplaceCloudWithLocalLoading] = React.useState(false);

    const onClose = () => dispatch(clearResolveConflictModal());
    const replaceLocalWithCloud = () => {
        if (!userId || !saveId || !cloudHash) return;
        setRMPSave(SAVE_KEY.RMP, cloudData);
        dispatch(setBaseSync({ userId, saveId, hash: cloudHash }));
        notifyRMPSaveChange();
        onClose();
    };
    const downloadCloud = () => {
        downloadAs(`RMP_cloud_${Date.now()}.json`, 'application/json', cloudData);
    };
    const replaceCloudWithLocal = async () => {
        if (!saveId || !token || !cloudHash || !userId) return;
        setReplaceCloudWithLocalLoading(true);
        const rep = await updateSave(saveId, token, SAVE_KEY.RMP, cloudHash);
        if (!rep) {
            dispatch(logout());
            setReplaceCloudWithLocalLoading(false);
            return;
        }
        if (rep.status === 409) {
            dispatch(syncAfterLogin());
            setReplaceCloudWithLocalLoading(false);
            return;
        }
        if (rep.status !== 200) {
            setReplaceCloudWithLocalLoading(false);
            return;
        }

        const localSave = await getRMPSave(SAVE_KEY.RMP);
        if (localSave) {
            dispatch(setBaseSync({ userId, saveId, hash: localSave.hash }));
        }
        dispatch(fetchSaveList());
        setReplaceCloudWithLocalLoading(false);
        onClose();
    };
    const downloadLocal = async () => {
        const localSave = await getRMPSave(SAVE_KEY.RMP);
        if (!localSave) return;
        downloadAs(`RMP_local_${Date.now()}.json`, 'application/json', localSave.data);
    };

    return (
        <Modal
            opened={isOpen}
            onClose={() => {}} // do not allow user to close before resolving the conflict
            size="lg"
            title={t("Oops! It seems there's a conflict")}
            withCloseButton={false}
            closeOnClickOutside={false}
            closeOnEscape={false}
            centered
        >
            <Text>{t('The local save is newer than the cloud one. Which one would you like to keep?')}</Text>

            <Group my="xs">
                <Card withBorder className={classes.card}>
                    <Stack>
                        <Flex>
                            <MdOutlineComputer />
                            <Text span>{t('Local save')}</Text>
                        </Flex>
                        <Button
                            color="red"
                            loading={replaceCloudWithLocalLoading}
                            onClick={() => replaceCloudWithLocal()}
                        >
                            {t('Replace cloud with local')}
                        </Button>
                        <Button onClick={() => downloadLocal()}>{t('Download Local save')}</Button>
                    </Stack>
                </Card>
                <Card withBorder className={classes.card}>
                    <Stack>
                        <Flex>
                            <MdOutlineCloud />
                            <Text span>{t('Cloud save')}</Text>
                        </Flex>
                        <Button color="red" onClick={() => replaceLocalWithCloud()}>
                            {t('Replace local with cloud')}
                        </Button>
                        <Button onClick={() => downloadCloud()}>{t('Download Cloud save')}</Button>
                    </Stack>
                </Card>
            </Group>
        </Modal>
    );
};

export default ResolveConflictModal;
