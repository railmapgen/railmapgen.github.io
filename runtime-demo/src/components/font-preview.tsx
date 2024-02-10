import { Box, BoxProps } from '@chakra-ui/react';

export default function FontPreview(props: BoxProps) {
    return (
        <Box {...props}>
            <p>
                All human beings are born free and equal in dignity and rights. They are endowed with reason and
                conscience and should act towards one another in a spirit of brotherhood.
            </p>
            <p>人皆生而自由；在尊嚴及權利上均各平等。人各賦有理性良知，誠應和睦相處，情同手足。</p>
            <p>人人生而自由，在尊严和权利上一律平等。他们赋有理性和良心，并应以兄弟关系的精神相对待。</p>
        </Box>
    );
}
