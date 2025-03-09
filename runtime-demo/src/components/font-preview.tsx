import { Stack, StackProps, Text } from '@mantine/core';

export default function FontPreview(props: StackProps) {
    return (
        <Stack gap="xs" {...props}>
            <Text>
                All human beings are born free and equal in dignity and rights. They are endowed with reason and
                conscience and should act towards one another in a spirit of brotherhood.
            </Text>
            <Text>人皆生而自由；在尊嚴及權利上均各平等。人各賦有理性良知，誠應和睦相處，情同手足。</Text>
            <Text>人人生而自由，在尊严和权利上一律平等。他们赋有理性和良心，并应以兄弟关系的精神相对待。</Text>
        </Stack>
    );
}
