import {
    ActionIcon,
    Alert,
    Button,
    CopyButton,
    Group,
    Modal,
    Space,
    Stack,
    Text,
    TextInput,
    Title,
    Tooltip,
} from '@mantine/core';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdContentCopy, MdWarning } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList, logout } from '../../../redux/account/account-slice';
import { addNotification } from '../../../redux/notification/notification-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT, APISaveInfo } from '../../../util/constants';

const defaultSaveInfo: APISaveInfo = {
    index: '0',
    id: 0,
    hash: '',
    lastUpdateAt: '1970-01-01T00:00:00Z',
};

interface ShareModalProps {
    opened: boolean;
    onClose: () => void;
    shareSaveInfo?: APISaveInfo;
}

const ShareModal: React.FC<ShareModalProps> = ({ opened, onClose, shareSaveInfo }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const dispatch = useRootDispatch();
    const { id: saveID, index, share } = shareSaveInfo ?? defaultSaveInfo;

    const { token, activeSubscriptions } = useRootSelector(state => state.account);

    const handleCopy = () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset copied status after 2 seconds
    };

    const handleCreateShare = async () => {
        try {
            const rep = await apiFetch(API_ENDPOINT.SHARE + `/${saveID}`, { method: 'POST' }, token);
            if (rep.status === 401) {
                dispatch(
                    addNotification({
                        type: 'error',
                        title: t('Session expired.'),
                        message: t('Please log in again.'),
                        duration: 5000,
                    })
                );
                dispatch(logout());
                return;
            }
            if (rep.status !== 201) {
                dispatch(
                    addNotification({
                        type: 'error',
                        title: t('Error'),
                        message: await rep.text(),
                        duration: 5000,
                    })
                );
                return;
            }
            dispatch(fetchSaveList());
            dispatch(
                addNotification({
                    type: 'success',
                    title: t('Success'),
                    message: t('Share link created successfully.'),
                    duration: 3000,
                })
            );
        } catch (e) {
            dispatch(
                addNotification({
                    type: 'error',
                    title: t('Error'),
                    message: (e as Error).message,
                    duration: 5000,
                })
            );
        }
    };

    const handleDeleteShare = async () => {
        try {
            const rep = await apiFetch(API_ENDPOINT.SHARE + `/${saveID}`, { method: 'DELETE' }, token);
            if (rep.status === 401) {
                dispatch(
                    addNotification({
                        type: 'error',
                        title: t('Session expired.'),
                        message: t('Please log in again.'),
                        duration: 5000,
                    })
                );
                dispatch(logout());
                return;
            }
            if (rep.status !== 204) {
                dispatch(
                    addNotification({
                        type: 'error',
                        title: t('Error'),
                        message: await rep.text(),
                        duration: 5000,
                    })
                );
                return;
            }
            dispatch(fetchSaveList());
            dispatch(
                addNotification({
                    type: 'success',
                    title: t('Success'),
                    message: t('Share link deleted successfully.'),
                    duration: 3000,
                })
            );
        } catch (e) {
            dispatch(
                addNotification({
                    type: 'error',
                    title: t('Error'),
                    message: (e as Error).message,
                    duration: 5000,
                })
            );
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={<Title size="h3">{`${t('Share work {{index}}', { index })}`}</Title>}
            size="lg"
        >
            <Text mb="sm">{t('Share this link with others to allow them to view this work.')}</Text>
            {share ? (
                <Stack>
                    <TextInput
                        value={`${window.origin}?app=rmp&s=${share.s}.org`}
                        readOnly
                        style={{ flexGrow: 1 }}
                        rightSection={
                            <CopyButton value={`${window.origin}?app=rmp&s=${share.s}.org`} timeout={2000}>
                                {({ copied: btnCopied, copy }) => (
                                    <Tooltip label={btnCopied ? t('Copied') : t('Copy')} withArrow position="right">
                                        <ActionIcon
                                            color={btnCopied ? 'teal' : 'gray'}
                                            onClick={() => {
                                                copy();
                                                handleCopy();
                                            }}
                                        >
                                            {btnCopied || copied ? <MdCheck /> : <MdContentCopy />}
                                        </ActionIcon>
                                    </Tooltip>
                                )}
                            </CopyButton>
                        }
                    />
                    <Group justify="space-between">
                        <Text>
                            {t('This link is valid until:')}{' '}
                            {new Date(
                                share.validUntil ?? activeSubscriptions.RMP_EXPORT ?? Date.now().toLocaleString()
                            ).toLocaleString()}
                        </Text>
                        <Button color="red" onClick={handleDeleteShare} ml="xs" size="sm" variant="light">
                            {t('Delete Share')}
                        </Button>
                    </Group>
                </Stack>
            ) : (
                <Group>
                    <Button onClick={handleCreateShare} leftSection={<MdContentCopy />}>
                        {t('Create Share Link')}
                    </Button>
                </Group>
            )}

            <Space h="md" />
            <Alert
                color="yellow"
                icon={<MdWarning />}
                title={t(
                    'Please be aware that sharing this link does not create a separate copy of your work. Instead, everyone who opens the link will always see the most up-to-date version. So, if you make changes after sharing the link, those changes will be visible to everyone who has the link.'
                )}
            />
            <Space h="md" />
            <Alert
                color="yellow"
                icon={<MdWarning />}
                title={t(
                    'Link will be valid as long as you have an active subscription. Otherwise, the link will be invalid after 1 day.'
                )}
            />

            <Group mt="md">
                <Button onClick={onClose} variant="light" style={{ marginLeft: 'auto' }}>
                    {t('Close')}
                </Button>
            </Group>
        </Modal>
    );
};

export default ShareModal;
