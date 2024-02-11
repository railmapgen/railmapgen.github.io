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
import { assetEnablement } from '../../util/asset-enablements';
import { getVersion } from '../../service/info-service';

interface AboutModalProps {
    appId?: string;
    onClose: () => void;
}

export default function AboutModal(props: AboutModalProps) {
    const { appId, onClose } = props;
    const { t } = useTranslation();

    const [version, setVersion] = useState('Unknown');
    const component = appId ? assetEnablement[appId]?.url?.split('/')?.[1] : undefined;

    useEffect(() => {
        if (component) {
            getVersion(component).then(data => setVersion(data));
        } else {
            setVersion('Unknown');
        }
    }, [component]);

    return (
        <Modal isOpen={!!appId} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>
                    {t('About') +
                        ' ' +
                        (appId
                            ? assetEnablement[appId].name
                                  .split(' - ')
                                  .map(n => t(n))
                                  .join(' - ')
                            : '')}
                    <Badge ml={1}>{version}</Badge>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody />

                <ModalFooter>
                    <Button
                        colorScheme="primary"
                        onClick={() => window.open('https://github.com/railmapgen/' + component, '_blank')}
                    >
                        {t('Visit GitHub')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
