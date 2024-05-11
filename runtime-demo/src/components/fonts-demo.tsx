import { RmgFields, RmgFieldsField, RmgSection, RmgSectionHeader } from '@railmapgen/rmg-components';
import { chakra, Heading } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import FontPreview from './font-preview';

export default function FontsDemo() {
    const [allFonts, setAllFonts] = useState<Awaited<ReturnType<typeof rmgRuntime.getAllFonts>>>({});
    const [selectedFont, setSelectedFont] = useState<string>();

    useEffect(() => {
        rmgRuntime.getAllFonts().then(setAllFonts);
    }, []);

    const fontOptions = Object.entries(allFonts).reduce<Record<string, string>>(
        (acc, cur) => ({
            ...acc,
            [cur[0]]: cur[1].displayName ?? cur[0],
        }),
        { '': 'Default' }
    );

    const handleSelectFont = async (font: string) => {
        if (font) {
            await rmgRuntime.loadFont(font);
        }
        setSelectedFont(font);
    };

    const fields: RmgFieldsField[] = [
        {
            type: 'select',
            label: 'Display font',
            options: fontOptions,
            value: selectedFont,
            onChange: value => handleSelectFont(value as string),
        },
        {
            type: 'output',
            label: 'Preview',
            value: <FontPreview fontFamily={selectedFont || undefined} />,
        },
    ];

    return (
        <RmgSection>
            <RmgSectionHeader>
                <Heading as="h5" size="sm">
                    Fonts
                </Heading>
            </RmgSectionHeader>
            <chakra.div px={1}>
                <RmgFields fields={fields} minW="full" />
            </chakra.div>
        </RmgSection>
    );
}
