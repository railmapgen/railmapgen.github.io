import {
    Button,
    Card,
    CardBody,
    CardFooter,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Stack,
    Text,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchSaveList, logout, setToken, syncAfterLogin } from '../../redux/account/account-slice';
import { clearResolveConflictModal, setLastChangedAt } from '../../redux/save/save-slice';
import { SAVE_KEY } from '../../util/constants';
import { downloadAs } from '../../util/download';
import { getRMPSave, notifyRMPSaveChange, setRMPSave, updateSave } from '../../util/local-storage-save';

const ResolveConflictModal = () => {
    const { t } = useTranslation();
    const { token, refreshToken, currentSaveId } = useRootSelector(state => state.account);
    const {
        resolveConflictModal: { isOpen, lastChangedAt, lastUpdatedAt, cloudData },
    } = useRootSelector(state => state.save);
    const dispatch = useRootDispatch();

    const onClose = () => dispatch(clearResolveConflictModal());
    const replaceLocalWithCloud = () => {
        setRMPSave(SAVE_KEY.RMP, cloudData);
        notifyRMPSaveChange();
        dispatch(setLastChangedAt(new Date()));
        onClose();
    };
    const downloadCloud = () => {
        downloadAs(`RMP_${lastUpdatedAt.valueOf()}.json`, 'application/json', cloudData);
    };
    const replaceCloudWithLocal = async () => {
        if (!currentSaveId || !token || !refreshToken) return;
        const {
            rep,
            token: updatedToken,
            refreshToken: updatedRefreshToken,
        } = await updateSave(currentSaveId, token, refreshToken, SAVE_KEY.RMP);
        if (!updatedRefreshToken || !updatedToken) {
            dispatch(logout());
            return;
        }
        dispatch(setToken({ access: updatedToken, refresh: updatedRefreshToken }));
        if (rep.status === 409) {
            dispatch(syncAfterLogin());
            return;
        }
        if (rep.status !== 200) return;
        dispatch(fetchSaveList());
        onClose();
    };
    const downloadLocal = async () => {
        // fetchLogin will handle local save does not exist
        const { data: localData } = (await getRMPSave(SAVE_KEY.RMP))!;
        downloadAs(`RMP_${lastChangedAt.valueOf()}.json`, 'application/json', localData);
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
                <ModalCloseButton />

                <ModalBody>
                    <Text>{t('Local work is newer than the cloud. Which one would you like to preserve?')}</Text>

                    <Card overflow="hidden" variant="outline" mb="3">
                        <Stack direction={{ base: 'column', sm: 'row' }}>
                            <CardBody>
                                <Text py="2" as="b">
                                    {t('Local save')}
                                </Text>
                                <Text py="2">
                                    {t('Update at:')} {lastChangedAt.toLocaleString()}
                                </Text>
                            </CardBody>
                            <CardFooter>
                                <Stack>
                                    <Button variant="solid" colorScheme="red" onClick={() => replaceCloudWithLocal()}>
                                        {t('Replace cloud with local')}
                                    </Button>
                                    <Button variant="solid" colorScheme="primary" onClick={() => downloadLocal()}>
                                        {t('Download local save')}
                                    </Button>
                                </Stack>
                            </CardFooter>
                        </Stack>
                    </Card>
                    <Card overflow="hidden" variant="outline" mb="3">
                        <Stack direction={{ base: 'column', sm: 'row' }}>
                            <CardBody>
                                <Text py="2" as="b">
                                    {t('Cloud save')}
                                </Text>
                                <Text py="2">
                                    {t('Update at:')} {lastUpdatedAt.toLocaleString()}
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
                        </Stack>
                    </Card>
                </ModalBody>

                <ModalFooter />
            </ModalContent>
        </Modal>
    );
};

export default ResolveConflictModal;
