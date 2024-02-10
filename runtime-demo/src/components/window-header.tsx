import { Heading } from '@chakra-ui/react';
import { RmgWindowHeader } from '@railmapgen/rmg-components';

export default function WindowHeader() {
    return (
        <RmgWindowHeader>
            <Heading as="h4" size="md">
                Runtime Demo
            </Heading>
        </RmgWindowHeader>
    );
}
