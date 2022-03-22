import { Flex, Link, ListItem, UnorderedList } from '@chakra-ui/react';
import React from 'react';
import WindowHeader from './window-header';
import { useAppSelector } from '../redux';
import { componentList } from '../util/constants';

export default function AppRoot() {
    const exampleState = useAppSelector(state => state.app.exampleState);

    return (
        <Flex direction="column" height="100%" overflow="hidden">
            <WindowHeader />

            <UnorderedList>
                {Object.entries(componentList).map(([id, name]) => (
                    <ListItem key={id}>
                        <Link href={'/' + id}>{name}</Link>
                    </ListItem>
                ))}
            </UnorderedList>
        </Flex>
    );
}
