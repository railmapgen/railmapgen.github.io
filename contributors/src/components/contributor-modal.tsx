import classes from './contributor-modal.module.css';
import { useTranslation } from 'react-i18next';
import DevTeamSection from './dev-team-section';
import ResourceAdminSection from './resource-admin-section';
import ResourceContributorSection from './resource-contributor-section';
import DonatorSection from './donator-section';
import { Button, Group } from '@mantine/core';
import { RMPageBody } from '@railmapgen/mantine-components';

export default function ContributorModal() {
    const { t } = useTranslation();

    return (
        <RMPageBody className={classes.body}>
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
        </RMPageBody>
    );
}
