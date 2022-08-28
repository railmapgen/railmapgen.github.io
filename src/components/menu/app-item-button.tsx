import React, { useEffect, useState } from 'react';
import { openApp } from '../../redux/app/app-slice';
import { AppId, componentList } from '../../util/constants';
import { Badge, Button } from '@chakra-ui/react';
import { useRootDispatch } from '../../redux';
import { getVersion } from '../../service/info-service';

interface AppItemProps {
    appId: AppId;
}

export default function AppItemButton(props: AppItemProps) {
    const { appId } = props;
    const dispatch = useRootDispatch();

    const [version, setVersion] = useState('unknown');

    useEffect(() => {
        getVersion(appId).then(data => setVersion(data));
    }, [appId]);

    return (
        <Button variant="ghost" size="sm" onClick={() => dispatch(openApp(appId))} w="100%" alignSelf="flex-start">
            <span>{componentList[appId]}</span>
            <Badge ml="auto">{version}</Badge>
        </Button>
    );
}
