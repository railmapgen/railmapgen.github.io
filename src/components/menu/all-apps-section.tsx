import React from 'react';
import { AppId, componentList } from '../../util/constants';
import { Button, Flex } from '@chakra-ui/react';
import { openApp } from '../../redux/app/app-slice';
import { useRootDispatch } from '../../redux';

export default function AllAppsSection() {
    const dispatch = useRootDispatch();

    return (
        <Flex direction="column">
            {Object.entries(componentList).map(([id, name]) => (
                <Button key={id} variant="ghost" size="sm" onClick={() => dispatch(openApp(id as AppId))}>
                    {name}
                </Button>
            ))}
        </Flex>
    );
}
