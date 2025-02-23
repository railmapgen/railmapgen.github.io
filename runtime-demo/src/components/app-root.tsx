import WindowHeader from './window-header';
import FontsDemo from './fonts-demo';
import MetadataDemo from './metadata-demo';
import { RMMantineProvider, RMPage, RMPageBody, RMWindow } from '@railmapgen/mantine-components';

export default function AppRoot() {
    return (
        <RMMantineProvider>
            <RMWindow>
                <WindowHeader />
                <RMPage w={{ base: '100%', sm: 600 }} style={{ alignSelf: 'center' }}>
                    <RMPageBody direction="column" px="xs" pb="xs" style={{ overflowY: 'auto' }}>
                        <FontsDemo />
                        <MetadataDemo />
                    </RMPageBody>
                </RMPage>
            </RMWindow>
        </RMMantineProvider>
    );
}
