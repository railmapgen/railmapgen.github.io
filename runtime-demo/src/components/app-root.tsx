import WindowHeader from './window-header';
import { RmgPage, RmgThemeProvider, RmgWindow } from '@railmapgen/rmg-components';
import FontsDemo from './fonts-demo';
import MetadataDemo from './metadata-demo';

export default function AppRoot() {
    return (
        <RmgThemeProvider>
            <RmgWindow>
                <WindowHeader />
                <RmgPage
                    alignSelf="center"
                    sx={{
                        width: { base: '100%', md: 520 },
                    }}
                >
                    <FontsDemo />
                    <MetadataDemo />
                </RmgPage>
            </RmgWindow>
        </RmgThemeProvider>
    );
}
