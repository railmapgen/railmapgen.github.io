import classes from './resolve-conflict-modal.module.css';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineCloud, MdOutlineComputer } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchSaveList, logout, syncAfterLogin } from '../../redux/account/account-slice';
import { clearResolveConflictModal, setLastChangedAtTimeStamp } from '../../redux/rmp-save/rmp-save-slice';
import { SAVE_KEY } from '../../util/constants';
import { downloadAs } from '../../util/download';
import { getRMPSave, notifyRMPSaveChange, setRMPSave, updateSave } from '../../util/local-storage-save';
import { Button, Card, Flex, Group, Modal, Stack, Text } from '@mantine/core';

const ResolveConflictModal = () => {
    const { t } = useTranslation();
    const { token, refreshToken, currentSaveId } = useRootSelector(state => state.account);
    const {
        resolveConflictModal: { isOpen, lastChangedAtTimeStamp, lastUpdatedAtTimeStamp, cloudData },
    } = useRootSelector(state => state.rmpSave);
    const dispatch = useRootDispatch();

    const [replaceCloudWithLocalLoading, setReplaceCloudWithLocalLoading] = React.useState(false);

    const onClose = () => dispatch(clearResolveConflictModal());
    const replaceLocalWithCloud = () => {
        setRMPSave(SAVE_KEY.RMP, cloudData);
        notifyRMPSaveChange();
        dispatch(setLastChangedAtTimeStamp(lastUpdatedAtTimeStamp));
        onClose();
    };
    const downloadCloud = () => {
        downloadAs(`RMP_${lastUpdatedAtTimeStamp}.json`, 'application/json', cloudData);
    };
    const replaceCloudWithLocal = async () => {
        if (!currentSaveId || !token || !refreshToken) return;
        setReplaceCloudWithLocalLoading(true);
        const rep = await updateSave(currentSaveId, token, refreshToken, SAVE_KEY.RMP);
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
        if (rep.status !== 200) return;
        dispatch(fetchSaveList());
        setReplaceCloudWithLocalLoading(false);
        onClose();
    };
    const downloadLocal = async () => {
        // fetchLogin will handle local save that does not exist
        const { data: localData } = (await getRMPSave(SAVE_KEY.RMP))!;
        downloadAs(`RMP_${lastChangedAtTimeStamp}.json`, 'application/json', localData);
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
                        <Text span>
                            {t('Update at:')} {new Date(lastChangedAtTimeStamp).toLocaleString()}
                        </Text>
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

                        <Text span>
                            {t('Update at:')} {new Date(lastUpdatedAtTimeStamp).toLocaleString()}
                        </Text>
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
