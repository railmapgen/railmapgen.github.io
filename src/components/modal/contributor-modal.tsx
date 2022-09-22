import React from 'react';
import {
    Avatar,
    Button,
    Flex,
    Heading,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Tag,
    TagLabel,
    Text,
    VStack,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';

const CONTRIBUTORS_ADMINS = ['52PD', 'linchen1965'];
const CONTRIBUTORS_LIST = [
    'jealousyge',
    'Jay20081229',
    'clearng-kly',
    'Dingdong2334',
    'C1P918R',
    'AnDanJuneUnderline',
    'GrassRabbit1410',
    'xiany114514',
    'Andy1782010',
    'Thomastzc',
    'Tianxiu11111',
];

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

                <ModalBody>
                    <Heading as="h6" size="xs" my={1}>
                        {t('Core contributors')}
                    </Heading>

                    <VStack>
                        <Tag
                            size="lg"
                            minW="80%"
                            onClick={() => window.open('https://github.com/wongchito', '_blank')}
                            cursor="pointer"
                        >
                            <Avatar src="https://github.com/wongchito.png" size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel display="block">
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    Chito Wong
                                </Text>
                                <Text fontSize="sm">Project initiator</Text>
                                <Text fontSize="sm">Author of MTR and Guangzhou Metro styles</Text>
                            </TagLabel>
                        </Tag>
                        <Tag
                            size="lg"
                            minW="80%"
                            onClick={() => window.open('https://github.com/thekingofcity', '_blank')}
                            cursor="pointer"
                        >
                            <Avatar src="https://github.com/thekingofcity.png" size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel display="block">
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    thekingofcity
                                </Text>
                                <Text fontSize="sm">Author of Shanghai Metro style</Text>
                                <Text fontSize="sm">Desktop version (Electron) maintainer</Text>
                            </TagLabel>
                        </Tag>
                    </VStack>

                    <Heading as="h6" size="xs" my={1}>
                        {t('Resource contributors')}
                    </Heading>

                    <Flex wrap="wrap">
                        {CONTRIBUTORS_ADMINS.map(contributor => (
                            <Tag
                                key={contributor}
                                size="lg"
                                mb={1}
                                mr={1}
                                flex="100%"
                                onClick={() =>
                                    window.open(
                                        `https://github.com/railmapgen/rmg/issues?q=is:issue+author:${contributor}`,
                                        '_blank'
                                    )
                                }
                                cursor="pointer"
                            >
                                <Avatar src={`https://github.com/${contributor}.png`} size="xs" ml={-1} mr={2} />
                                <TagLabel>{contributor}</TagLabel>
                                <TagLabel flexGrow={1} />
                                <TagLabel>
                                    <Text fontSize="sm">{t('Resource Administrator')}</Text>
                                </TagLabel>
                            </Tag>
                        ))}
                        {CONTRIBUTORS_LIST.map(contributor => (
                            <Tag
                                key={contributor}
                                size="lg"
                                mb={1}
                                mr={1}
                                onClick={() =>
                                    window.open(
                                        `https://github.com/railmapgen/rmg/issues?q=is:issue+author:${contributor}`,
                                        '_blank'
                                    )
                                }
                                cursor="pointer"
                            >
                                <Avatar src={`https://github.com/${contributor}.png`} size="xs" ml={-1} mr={2} />
                                <TagLabel>{contributor}</TagLabel>
                            </Tag>
                        ))}
                    </Flex>
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
