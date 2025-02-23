import { useEffect, useState } from 'react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { Button, Group, Text, Title } from '@mantine/core';

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
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    Metadata
                </Title>
            </RMSectionHeader>
            <Group>
                <Text w="100%">iframe src: {frameSrc}</Text>
                <Text w="100%">Document location: {documentLocation}</Text>
                <Text w="100%">Persisted URL: {persistedUrl}</Text>
                <Button onClick={handleUpdateTitle}>Update title</Button>
                <Button onClick={handleUpdateSearch}>Update search</Button>
                <Button onClick={handleResetSearch}>Reset search</Button>
                <Button onClick={handleUpdateHash}>Update hash</Button>
                <Button onClick={handleResetHash}>Reset hash</Button>
            </Group>
        </RMSection>
    );
}
