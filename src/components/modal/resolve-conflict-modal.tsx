import {
    Button,
    Card,
    CardBody,
    CardFooter,
    Modal,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Text,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdCloudCircle, MdComputer } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchSaveList, logout, setToken, syncAfterLogin } from '../../redux/account/account-slice';
import { clearResolveConflictModal, setLastChangedAtTimeStamp } from '../../redux/rmp-save/rmp-save-slice';
import { SAVE_KEY } from '../../util/constants';
import { downloadAs } from '../../util/download';
import { getRMPSave, notifyRMPSaveChange, setRMPSave, updateSave } from '../../util/local-storage-save';

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
        dispatch(setLastChangedAtTimeStamp(new Date().valueOf()));
        onClose();
    };
    const downloadCloud = () => {
        downloadAs(`RMP_${lastUpdatedAtTimeStamp}.json`, 'application/json', cloudData);
    };
    const replaceCloudWithLocal = async () => {
        if (!currentSaveId || !token || !refreshToken) return;
        setReplaceCloudWithLocalLoading(true);
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await updateSave(currentSaveId, token, refreshToken, SAVE_KEY.RMP);
        if (!updatedRefreshToken || !updatedToken) {
            dispatch(logout());
            setReplaceCloudWithLocalLoading(false);
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
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
        // fetchLogin will handle local save does not exist
        const { data: localData } = (await getRMPSave(SAVE_KEY.RMP))!;
        downloadAs(`RMP_${lastChangedAtTimeStamp}.json`, 'application/json', localData);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {}} // do not allow user to close before resolving the conflict
            size="xl"
            scrollBehavior="inside"
            closeOnOverlayClick={false}
            closeOnEsc={false}
        >
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Oops! There is some conflict')}</ModalHeader>

                <ModalBody>
                    <Text>{t('Local work is newer than the cloud. Which one would you like to preserve?')}</Text>

                    <Stack direction={{ base: 'column', sm: 'row' }} mt="5">
                        <Card overflow="hidden" variant="outline" mb="3">
                            <CardBody>
                                <MdComputer size="md" />
                                <Text py="2" as="b">
                                    {t('Local save')}
                                </Text>
                                <Text py="2">
                                    {t('Update at:')} {new Date(lastChangedAtTimeStamp).toLocaleString()}
                                </Text>
                            </CardBody>
                            <CardFooter>
                                <Stack>
                                    <Button
                                        variant="solid"
                                        colorScheme="red"
                                        isLoading={replaceCloudWithLocalLoading}
                                        onClick={() => replaceCloudWithLocal()}
                                    >
                                        {t('Replace cloud with local')}
                                    </Button>
                                    <Button variant="solid" colorScheme="primary" onClick={() => downloadLocal()}>
                                        {t('Download local save')}
                                    </Button>
                                </Stack>
                            </CardFooter>
                        </Card>
                        <Card overflow="hidden" variant="outline" mb="3">
                            <CardBody>
                                <MdCloudCircle size="md" />
                                <Text py="2" as="b">
                                    {t('Cloud save')}
                                </Text>
                                <Text py="2">
                                    {t('Update at:')} {new Date(lastUpdatedAtTimeStamp).toLocaleString()}
                                </Text>
                            </CardBody>
                            <CardFooter>
                                <Stack>
                                    <Button variant="solid" colorScheme="red" onClick={() => replaceLocalWithCloud()}>
                                        {t('Replace local with cloud')}
                                    </Button>
                                    <Button variant="solid" colorScheme="primary" onClick={() => downloadCloud()}>
                                        {t('Download cloud save')}
                                    </Button>
                                </Stack>
                            </CardFooter>
                        </Card>
                    </Stack>
                </ModalBody>

                <ModalFooter />
            </ModalContent>
        </Modal>
    );
};

export default ResolveConflictModal;
