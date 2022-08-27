import { Flex, Link, ListItem, UnorderedList } from '@chakra-ui/react';
import React from 'react';
import WindowHeader from './window-header';
import { componentList } from '../util/constants';
import StatusDataTable from './data-table/status-data-table';

export default function AppRoot() {
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
            <StatusDataTable />
        </Flex>
    );
}
