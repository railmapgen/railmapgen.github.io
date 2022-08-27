import React from 'react';
import { Badge, Heading } from '@chakra-ui/react';
import { Environments, getEnvironment, getVersion } from '../util/config';
import { RmgWindowHeader } from '@railmapgen/rmg-components';

export default function WindowHeader() {
    const environment = getEnvironment();
    const getBadgeColour = (env: Environments) => {
        switch (env) {
            case Environments.DEV:
                return 'red';
            case Environments.UAT:
                return 'orange';
            case Environments.PRD:
                return 'green';
        }
    };
    return (
        <RmgWindowHeader>
            <Heading as="h4" size="md" mr="auto">
                RMG Home
                <Badge ml={1} colorScheme={getBadgeColour(environment)}>
                    {environment === Environments.PRD ? getVersion() : environment}
                </Badge>
            </Heading>
        </RmgWindowHeader>
    );
}
