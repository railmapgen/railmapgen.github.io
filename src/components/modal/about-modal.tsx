import React, { useEffect, useState } from 'react';
import {
    Badge,
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { appEnablement, AppId } from '../../util/constants';
import { getVersion } from '../../service/info-service';

interface AboutModalProps {
    appId?: AppId;
    onClose: () => void;
}

export default function AboutModal(props: AboutModalProps) {
    const { appId, onClose } = props;
    const { t } = useTranslation();

    const [version, setVersion] = useState('Unknown');

    useEffect(() => {
        if (appId) {
            getVersion(appId).then(data => setVersion(data));
        } else {
            setVersion('Unknown');
        }
    }, [appId]);

    return (
        <Modal isOpen={!!appId} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    {t('About') + ' ' + (appId ? t(appEnablement[appId].name) : '')}
                    <Badge ml={1}>{version}</Badge>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody />

                <ModalFooter>
                    <Button
                        colorScheme="primary"
                        onClick={() => window.open('https://github.com/railmapgen/' + appId, '_blank')}
                    >
                        {t('Visit GitHub')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
