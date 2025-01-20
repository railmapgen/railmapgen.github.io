import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { Button, Heading, HStack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import rmgRuntime from '@railmapgen/rmg-runtime';

const getRandomInt = () => {
    return Math.ceil(Math.random() * 100);
};

export default function MetadataDemo() {
    const [updateId, setUpdateId] = useState(0);
    const [frameSrc, setFrameSrc] = useState<string | null>();
    const [documentLocation, setDocumentLocation] = useState<string>();
    const [persistedUrl, setPersistedUrl] = useState<string | null>();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setFrameSrc(window.frameElement?.getAttribute('src'));
            setDocumentLocation(window.location.href);
            setPersistedUrl(window.frameElement?.getAttribute('data-persisted-url'));
        }, 200);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [updateId]);

    const update = () => {
        const randomInt = getRandomInt();
        setUpdateId(randomInt);
        return randomInt;
    };

    const handleUpdateTitle = () => {
        rmgRuntime.updateAppMetadata({ title: `Runtime Demo (${update()})` });
    };

    const handleUpdateSearch = () => {
        rmgRuntime.updateAppMetadata({ search: `count=${update()}` });
    };

    const handleResetSearch = () => {
        setUpdateId(0);
        rmgRuntime.updateAppMetadata({ search: '' });
    };

    const handleUpdateHash = () => {
        rmgRuntime.updateAppMetadata({ hash: `/${update()}` });
    };

    const handleResetHash = () => {
        setUpdateId(0);
        rmgRuntime.updateAppMetadata({ hash: '' });
    };

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h5" size="sm">
                    Metadata
                </Heading>
            </RmgSectionHeader>
            <HStack wrap="wrap" px={1}>
                <Text w="100%">iframe src: {frameSrc}</Text>
                <Text w="100%">Document location: {documentLocation}</Text>
                <Text w="100%">Persisted URL: {persistedUrl}</Text>
                <Button size="sm" onClick={handleUpdateTitle}>
                    Update title
                </Button>
                <Button size="sm" onClick={handleUpdateSearch}>
                    Update search
                </Button>
                <Button size="sm" onClick={handleResetSearch}>
                    Reset search
                </Button>
                <Button size="sm" onClick={handleUpdateHash}>
                    Update hash
                </Button>
                <Button size="sm" onClick={handleResetHash}>
                    Reset hash
                </Button>
            </HStack>
        </RmgSection>
    );
}
