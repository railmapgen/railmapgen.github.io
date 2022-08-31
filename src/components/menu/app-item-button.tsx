import React, { useEffect, useState } from 'react';
import { openApp } from '../../redux/app/app-slice';
import { AppId, componentList } from '../../util/constants';
import { Badge, Button, SystemStyleObject } from '@chakra-ui/react';
import { useRootDispatch } from '../../redux';
import { getVersion } from '../../service/info-service';

const style: SystemStyleObject = {
    w: '100%',
    overflow: 'hidden',
    justifyContent: 'flex-start',

    '& span:first-of-type': {
        textOverflow: 'ellipsis',
        overflow: 'hidden',
    },

    '& span:last-of-type': {
        ml: 'auto',
    },
};

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
        <Button variant="ghost" size="sm" onClick={() => dispatch(openApp(appId))} sx={style}>
            <span>{componentList[appId]}</span>
            <Badge>{version}</Badge>
        </Button>
    );
}
