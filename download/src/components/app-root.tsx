import { Button, Text, Title } from '@mantine/core';
import { RMMantineProvider, RMWindow, RMWindowHeader } from '@railmapgen/mantine-components';
import { useTranslation } from 'react-i18next';
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa';
import { MdDownload } from 'react-icons/md';
import screenshot from '../assets/rail-map-toolkit.png';
import classes from './app-root.module.css';

const desktopPlatforms = [
    {
        name: 'Windows',
        Icon: FaWindows,
        downloads: [
            { label: 'x64', suffix: 'x64-setup.exe' },
            { label: 'ARM64', suffix: 'arm64-setup.exe' },
        ],
    },
    {
        name: 'macOS',
        Icon: FaApple,
        downloads: [
            { label: 'Apple Silicon', suffix: 'aarch64.dmg' },
            { label: 'Intel', suffix: 'x64.dmg' },
        ],
    },
    {
        name: 'Linux',
        Icon: FaLinux,
        downloads: [{ label: 'x64 AppImage', suffix: 'amd64.AppImage' }],
    },
];

export default function AppRoot() {
    const { t } = useTranslation();
    const now = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;
    const tag = `${year}${String(month).padStart(2, '0')}01`;
    const version = `${String(year).slice(-2)}.${month}.1`;
    const downloadBase = `https://ghfast.top/https://github.com/railmapgen/railmapgen.github.io/releases/download/tauri-${tag}/Rail.Map.Toolkit_${version}_`;

    return (
        <RMMantineProvider>
            <RMWindow>
                <RMWindowHeader>
                    <Title>{t('Download desktop app')}</Title>
                </RMWindowHeader>
                <main className={classes.page}>
                    <div className={classes.hero}>
                        <div className={classes.copy}>
                            <Title order={2} className={classes.title}>
                                {t('DownloadPage.title')}
                            </Title>
                            <Text className={classes.subtitle}>{t('DownloadPage.subtitle')}</Text>
                        </div>

                        <div className={classes.preview}>
                            <img src={screenshot} alt={t('DownloadPage.screenshot')} />
                        </div>

                        <div className={classes.downloads}>
                            {desktopPlatforms.map(({ name, Icon, downloads }) => (
                                <section key={name} aria-label={name} className={classes.platform}>
                                    <div className={classes['platform-name']}>
                                        <Icon aria-hidden size={22} />
                                        <Text fw={600}>{name}</Text>
                                    </div>
                                    <div className={classes.buttons}>
                                        {downloads.map(({ label, suffix }) => (
                                            <Button
                                                key={suffix}
                                                component="a"
                                                href={downloadBase + suffix}
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label={`${t('Download')} ${name} ${label}`}
                                                variant="light"
                                                radius="md"
                                                rightSection={<MdDownload aria-hidden size={18} />}
                                            >
                                                {label}
                                            </Button>
                                        ))}
                                    </div>
                                </section>
                            ))}
                            {[
                                { name: 'Android', Icon: FaAndroid },
                                { name: 'iOS', Icon: FaApple },
                            ].map(({ name, Icon }) => (
                                <section key={name} aria-label={name} className={classes.platform}>
                                    <div className={classes['platform-name']}>
                                        <Icon aria-hidden size={22} />
                                        <Text fw={600}>{name}</Text>
                                    </div>
                                    <Text c="dimmed" size="sm">
                                        {t('DownloadPage.comingSoon')}
                                    </Text>
                                </section>
                            ))}
                            <Text c="dimmed" size="xs" ta="right" className={classes.version}>
                                {t('DownloadPage.version')} {version}
                            </Text>
                        </div>
                    </div>
                </main>
            </RMWindow>
        </RMMantineProvider>
    );
}
