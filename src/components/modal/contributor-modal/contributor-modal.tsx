import React from 'react';
import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SystemStyleObject,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import DevTeamSection from './dev-team-section';
import ResourceAdminSection from './resource-admin-section';
import ResourceContributorSection from './resource-contributor-section';
import DonatorSection from './donator-section';

const styles: SystemStyleObject = {
    bg: 'inherit',
    py: 0,

    '& section:not(:last-of-type)': {
        mb: 4,
    },
};

interface ContributorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ContributorModal(props: ContributorModalProps) {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Contributors')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody sx={styles}>
                    <DevTeamSection />
                    <DonatorSection />
                    <ResourceAdminSection />
                    <ResourceContributorSection />
                </ModalBody>

                <ModalFooter>
                    <Button
                        colorScheme="primary"
                        onClick={() =>
                            window.open(
                                'https://github.com/railmapgen/rmg/wiki/How-to-add-color-palette-and-line-templates',
                                '_blank'
                            )
                        }
                    >
                        {t('Contribution Wiki')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
