import classes from './app-root.module.css';
import WindowHeader from './window-header';
import FontsDemo from './fonts-demo';
import MetadataDemo from './metadata-demo';
import { RMMantineProvider, RMPage, RMPageBody, RMWindow } from '@railmapgen/mantine-components';
import NotificationsDemo from './notifications-demo';

export default function AppRoot() {
    return (
        <RMMantineProvider>
            <RMWindow>
                <WindowHeader />
                <RMPage w={{ base: '100%', sm: 600 }} style={{ alignSelf: 'center' }}>
                    <RMPageBody className={classes.body} direction="column">
                        <FontsDemo />
                        <MetadataDemo />
                        <NotificationsDemo />
                    </RMPageBody>
                </RMPage>
            </RMWindow>
        </RMMantineProvider>
    );
}
