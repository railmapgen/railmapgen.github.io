import { RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { Button, Heading, HStack, Text } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import rmgRuntime from '@railmapgen/rmg-runtime';

export default function MetadataDemo() {
    const [count, setCount] = useState(0);
    const [frameSrc, setFrameSrc] = useState<string | null>();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setFrameSrc(window.frameElement?.getAttribute('src'));
        }, 200);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [count]);

    const incrementAndGet = () => {
        const prevCount = count;
        setCount(prevCount + 1);
        return prevCount + 1;
    };

    const handleUpdateTitle = () => {
        rmgRuntime.updateAppMetadata({ title: `Runtime Demo (${incrementAndGet()})` });
    };

    const handleUpdateSearch = () => {
        rmgRuntime.updateAppMetadata({ search: `count=${incrementAndGet()}` });
    };

    const handleUpdateHash = () => {
        rmgRuntime.updateAppMetadata({ hash: `/${incrementAndGet()}` });
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
                <Button size="sm" onClick={handleUpdateTitle}>
                    Update title
                </Button>
                <Button size="sm" onClick={handleUpdateSearch}>
                    Update search
                </Button>
                <Button size="sm" onClick={handleUpdateHash}>
                    Update hash
                </Button>
            </HStack>
        </RmgSection>
    );
}
