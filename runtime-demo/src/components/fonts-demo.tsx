import { useEffect, useState } from 'react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import FontPreview from './font-preview';
import { RMSection, RMSectionHeader } from '@railmapgen/mantine-components';
import { NativeSelect, Stack, Title } from '@mantine/core';

export default function FontsDemo() {
    const [allFonts, setAllFonts] = useState<Awaited<ReturnType<typeof rmgRuntime.getAllFonts>>>({});
    const [selectedFont, setSelectedFont] = useState<string>();

    useEffect(() => {
        rmgRuntime.getAllFonts().then(setAllFonts);
    }, []);

    const fontOptions = [
        { value: '', label: 'Default' },
        ...Object.entries(allFonts).map(cur => ({
            value: cur[0],
            label: cur[1].displayName ?? cur[0],
        })),
    ];

    const handleSelectFont = async (font: string) => {
        if (font) {
            await rmgRuntime.loadFont(font);
        }
        setSelectedFont(font);
    };

    return (
        <RMSection>
            <RMSectionHeader>
                <Title order={2} size="h4">
                    Fonts
                </Title>
            </RMSectionHeader>
            <Stack py="xs" gap="xs">
                <NativeSelect
                    label="Display font"
                    value={selectedFont}
                    onChange={({ currentTarget: { value } }) => handleSelectFont(value)}
                    data={fontOptions}
                />
                <FontPreview style={{ fontFamily: selectedFont || undefined }} />
            </Stack>
        </RMSection>
    );
}
