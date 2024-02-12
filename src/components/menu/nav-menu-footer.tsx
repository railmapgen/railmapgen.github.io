import { Button, Divider, Flex, Grid, GridItem } from '@chakra-ui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MdChevronLeft, MdPeople, MdSettings } from 'react-icons/md';
import ContributorModal from '../modal/contributor-modal/contributor-modal';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setMenuView } from '../../redux/app/app-slice';
import SupportButton from './support-button';

export default function NavMenuFooter() {
    const { t } = useTranslation();

    const dispatch = useRootDispatch();
    const { menuView, refreshRequired } = useRootSelector(state => state.app);

    const [isContributorModalOpen, setIsContributorModalOpen] = useState(false);

    return (
        <Flex direction="column">
            <Divider />

            {menuView === 'main' ? (
                <Grid templateColumns="repeat(3, auto)">
                    <GridItem>
                        <Button
                            variant="ghost"
                            size="sm"
                            w="100%"
                            leftIcon={<MdPeople />}
                            onClick={() => setIsContributorModalOpen(true)}
                        >
                            {t('Contributors')}
                        </Button>
                    </GridItem>

                    <GridItem>
                        <SupportButton />
                    </GridItem>

                    <GridItem>
                        <Button
                            variant="ghost"
                            size="sm"
                            w="100%"
                            leftIcon={<MdSettings />}
                            onClick={() => dispatch(setMenuView('settings'))}
                        >
                            {t('Settings')}
                        </Button>
                    </GridItem>
                </Grid>
            ) : (
                <Button
                    variant="ghost"
                    size="sm"
                    w="100%"
                    leftIcon={<MdChevronLeft />}
                    onClick={() => dispatch(setMenuView('main'))}
                    isDisabled={refreshRequired}
                >
                    {t('Go back')}
                </Button>
            )}

            <ContributorModal isOpen={isContributorModalOpen} onClose={() => setIsContributorModalOpen(false)} />
        </Flex>
    );
}
