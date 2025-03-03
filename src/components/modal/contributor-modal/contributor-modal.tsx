import classes from './contributor-modal.module.css';
import { useTranslation } from 'react-i18next';
import DevTeamSection from './dev-team-section';
import ResourceAdminSection from './resource-admin-section';
import ResourceContributorSection from './resource-contributor-section';
import DonatorSection from './donator-section';
import { Button, Group, Modal } from '@mantine/core';

interface ContributorModalProps {
    opened: boolean;
    onClose: () => void;
}

export default function ContributorModal(props: ContributorModalProps) {
    const { opened, onClose } = props;
    const { t } = useTranslation();

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            size="xl"
            title={t('Contributors')}
            classNames={{ body: classes.body }}
        >
            <DevTeamSection />
            <DonatorSection />
            <ResourceAdminSection />
            <ResourceContributorSection />

            <Group>
                <Button
                    component="a"
                    href="https://github.com/railmapgen/rmg/wiki/How-to-add-color-palette-and-line-templates"
                    target="_blank"
                >
                    {t('Contribution Wiki')}
                </Button>
            </Group>
        </Modal>
    );
}
