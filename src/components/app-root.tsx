import { Flex } from '@chakra-ui/react';
import React from 'react';
import WindowHeader from './window-header';
import { useAppSelector } from '../redux';

export default function AppRoot() {
    const exampleState = useAppSelector(state => state.app.exampleState);

    return (
        <Flex direction="column" height="100%" overflow="hidden">
            <WindowHeader />
            This is a seed project for RMG with React framework.
            <br />
            Please replace any "RMG Seed Project" or "seed-project" with the correct component name.
            <br />
            Chakra UI and Redux store are setup already. Here's an example state: {exampleState}.
        </Flex>
    );
}
