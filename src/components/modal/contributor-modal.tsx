import React from 'react';
import {
    Avatar,
    Button,
    Heading,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SystemStyleObject,
    Tag,
    TagLabel,
    Text,
    VStack,
    Wrap,
    WrapItem,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import ContributorAvatarWall from './contributor-avatar-wall';
import { appEnablement, AppId } from '../../util/constants';
import GithubAvatar from './github-avatar';

const CONTRIBUTORS_ADMINS = ['52PD', 'linchen1965'];

const styles: SystemStyleObject = {
    '& h5': {
        mt: 6,
        mb: 4,

        '&:first-of-type': {
            mt: 0,
        },
    },

    '& h6': {
        mt: 5,
        mb: 2,

        '&:first-of-type': {
            mt: 0,
        },
    },

    '& .dev-team-stack': {
        '& > span': {
            minW: '75%',
            borderRadius: 'lg',
            cursor: 'pointer',

            '& > span:last-of-type': {
                display: 'block',
            },

            '& p': {
                fontSize: 'sm',
                '&:first-of-type': {
                    fontSize: 'lg',
                    fontWeight: 'bold',
                    mb: 1,
                },
            },
        },

        '& .chakra-avatar': {
            ml: 1,
            mr: 3,
            my: 4,
        },
    },

    '& i': {
        mt: 3,
        fontSize: 'xs',
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
                    <Heading as="h5" size="sm">
                        {t('Developer team')}
                    </Heading>

                    <VStack className="dev-team-stack">
                        <Tag size="lg" onClick={() => window.open('https://github.com/wongchito', '_blank')}>
                            <Avatar src="https://github.com/wongchito.png" size="lg" />
                            <TagLabel>
                                <Text>Chito Wong</Text>
                                <Text>Author of Rail Map Toolkit platform</Text>
                                <Text>Author of Rail Map Generator</Text>
                            </TagLabel>
                        </Tag>
                        <Tag size="lg" onClick={() => window.open('https://github.com/thekingofcity', '_blank')}>
                            <Avatar src="https://github.com/thekingofcity.png" size="lg" />
                            <TagLabel>
                                <Text>thekingofcity</Text>
                                <Text>Author of Rail Map Painter</Text>
                                <Text>Author of RMG (Shanghai Metro style)</Text>
                            </TagLabel>
                        </Tag>
                    </VStack>

                    <Heading as="h5" size="sm">
                        {t('Resource administrators')}
                    </Heading>

                    <Wrap spacing={1.5}>
                        {CONTRIBUTORS_ADMINS.map(contributor => (
                            <WrapItem key={contributor}>
                                <GithubAvatar login={contributor} size="md" />
                            </WrapItem>
                        ))}
                    </Wrap>

                    <Heading as="h5" size="sm">
                        {t('Resource contributors')}
                    </Heading>

                    {Object.entries(appEnablement)
                        .filter(([_, detail]) => detail.showContributors)
                        .map(([appId, detail]) => (
                            <>
                                <Heading as="h6" size="xs" mt={5} mb={2}>
                                    {t(detail.name)}
                                </Heading>
                                <ContributorAvatarWall key={appId} appId={appId as AppId} />
                            </>
                        ))}

                    <Text as="i">{t('Notes: Contributors are sorted by number of commits and commit time.')}</Text>
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
