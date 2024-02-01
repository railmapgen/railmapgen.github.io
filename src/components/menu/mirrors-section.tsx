import { Button, Flex, Grid, GridItem, Heading, SystemStyleObject } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import rmgRuntime, { RmgInstance } from '@railmapgen/rmg-runtime';
import { MdOpenInNew } from 'react-icons/md';
import { Events, MIRROR_URLS, MIRRORS } from '../../util/constants';

const styles: SystemStyleObject = {
    flexDirection: 'column',
    py: 1,

    '& h4': {
        mx: 3,
        my: 2,
    },

    '& > div': {
        px: 2,

        '& button': {
            w: '100%',
        },
    },
};

export default function MirrorsSection() {
    const { t } = useTranslation();

    const availableMirrors = MIRRORS.filter(mirror => mirror !== rmgRuntime.getInstance());

    const handleSwitchMirror = (mirror: RmgInstance) => {
        if (mirror === 'Tauri') {
            const d = new Date();
            const tag = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}01`;
            const ver = `${String(d.getFullYear()).slice(-2)}.${d.getMonth() + 1}.1`;
            const platform = navigator.platform;
            const suffix = platform.includes('Linux')
                ? 'amd64.deb'
                : platform.includes('Mac')
                  ? 'x64.dmg'
                  : 'x64-setup.exe';
            const url = MIRROR_URLS[mirror] + '/tauri-${tag}/railmapgen_${ver}_${suffix}';
            window.open(url, '_blank');
            rmgRuntime.event(Events.DOWNLOAD_APP, {});
        } else {
            const url = MIRROR_URLS[mirror];
            window.open(url, '_blank');
            rmgRuntime.event(Events.SWITCH_MIRROR, { url });
        }
    };

    return (
        <Flex sx={styles}>
            <Heading as="h4" size="md">
                {t('Other mirrors')}
            </Heading>

            <Grid templateColumns={`repeat(${MIRRORS.length}, auto)`} gap={2}>
                {availableMirrors.map(mirror => (
                    <GridItem key={mirror}>
                        <Button
                            key={mirror}
                            variant="outline"
                            size="xs"
                            rightIcon={<MdOpenInNew />}
                            onClick={() => handleSwitchMirror(mirror)}
                        >
                            {mirror === 'Tauri' ? t('Download desktop app') : t(mirror)}
                        </Button>
                    </GridItem>
                ))}
            </Grid>
        </Flex>
    );
}
