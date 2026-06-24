import classes from './workspace.module.css';
import { useTranslation } from 'react-i18next';
import rmpLogo from '../../images/rmp-logo512.png';
import { Image, Stack, Text, Title } from '@mantine/core';
import { useRootDispatch } from '../../redux';
import { openApp } from '../../redux/app/app-slice';
import { assetEnablement } from '../../util/asset-enablements';
import { MdChevronRight, MdKeyboardArrowDown, MdKeyboardArrowUp } from 'react-icons/md';
import { useMediaQuery } from '@mantine/hooks';
import { type KeyboardEvent, type MouseEvent, useState } from 'react';

type WelcomeAppId = 'rmg' | 'rmp' | 'rma' | 'rsg';

interface WelcomeApp {
    appId: WelcomeAppId;
    descriptionKey: string;
    logoSrc?: string;
    logoText?: string;
}

const welcomeApps: WelcomeApp[] = [
    {
        appId: 'rmg',
        logoSrc: import.meta.env.BASE_URL + 'logo512.png',
        descriptionKey: 'WelcomePage.rmg',
    },
    {
        appId: 'rmp',
        logoSrc: rmpLogo,
        descriptionKey: 'WelcomePage.rmp',
    },
    {
        appId: 'rma',
        logoText: 'RMA',
        descriptionKey: 'WelcomePage.rma',
    },
    {
        appId: 'rsg',
        logoText: 'RSG',
        descriptionKey: 'WelcomePage.rsg',
    },
];

interface WelcomeAppCardProps {
    app: WelcomeApp;
    appName: string;
    onOpenApp: (appId: WelcomeAppId) => void;
    onOpenAppKeyDown: (event: KeyboardEvent<HTMLElement>, appId: WelcomeAppId) => void;
}

const AppIcon = ({ app }: { app: WelcomeApp }) => (
    <div className={classes['welcome-app-icon']} aria-hidden>
        {app.logoSrc ? (
            <Image src={app.logoSrc} alt="" className={classes['welcome-app-logo']} />
        ) : (
            <span className={classes['welcome-app-initials']}>{app.logoText}</span>
        )}
    </div>
);

const AppDescriptions = ({ app }: { app: WelcomeApp }) => {
    const { t } = useTranslation();

    return <Text className={classes['welcome-app-description']}>{t(app.descriptionKey)}</Text>;
};

const DesktopWelcomeAppCard = (props: WelcomeAppCardProps) => {
    const { t } = useTranslation();
    const { app, appName, onOpenApp, onOpenAppKeyDown } = props;

    return (
        <article
            className={classes['welcome-app-card']}
            role="button"
            tabIndex={0}
            aria-label={t('Open') + ' ' + appName}
            title={t('Open') + ' ' + appName}
            onClick={() => onOpenApp(app.appId)}
            onKeyDown={event => onOpenAppKeyDown(event, app.appId)}
        >
            <AppIcon app={app} />

            <Stack className={classes['welcome-app-copy']} gap={4}>
                <Title order={2}>{appName}</Title>
                <AppDescriptions app={app} />
            </Stack>

            <div className={classes['welcome-app-open']} aria-hidden>
                <MdChevronRight />
            </div>
        </article>
    );
};

const MobileWelcomeAppCard = (props: WelcomeAppCardProps) => {
    const { t } = useTranslation();
    const { app, appName, onOpenApp, onOpenAppKeyDown } = props;
    const [isExpanded, setIsExpanded] = useState(false);

    const handleExpandClick = (event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        setIsExpanded(value => !value);
    };

    const handleExpandKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        event.stopPropagation();
    };

    return (
        <article
            className={classes['welcome-app-card'] + ' ' + classes['welcome-app-card-mobile']}
            role="button"
            tabIndex={0}
            aria-label={t('Open') + ' ' + appName}
            title={t('Open') + ' ' + appName}
            onClick={() => onOpenApp(app.appId)}
            onKeyDown={event => onOpenAppKeyDown(event, app.appId)}
        >
            <div className={classes['welcome-app-mobile-summary']}>
                <AppIcon app={app} />
                <Title ml={10} order={2}>
                    {appName}
                </Title>
                <div className={classes['welcome-app-open']} aria-hidden>
                    <MdChevronRight />
                </div>
            </div>

            {isExpanded && (
                <div className={classes['welcome-app-mobile-detail']}>
                    <Stack className={classes['welcome-app-copy']} gap={4}>
                        <AppDescriptions app={app} />
                    </Stack>
                </div>
            )}

            <button
                type="button"
                className={classes['welcome-app-expand']}
                aria-expanded={isExpanded}
                aria-label={(isExpanded ? t('Collapse') : t('Expand')) + ' ' + appName}
                title={(isExpanded ? t('Collapse') : t('Expand')) + ' ' + appName}
                onClick={handleExpandClick}
                onKeyDown={handleExpandKeyDown}
            >
                {isExpanded ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
            </button>
        </article>
    );
};

export default function Welcome() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const isMobilePortrait = useMediaQuery('(max-width: 48em) and (orientation: portrait)', false, {
        getInitialValueInEffect: false,
    });

    const handleOpenApp = (appId: WelcomeAppId) => {
        dispatch(openApp({ appId }));
    };

    const handleOpenAppKeyDown = (event: KeyboardEvent<HTMLElement>, appId: WelcomeAppId) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleOpenApp(appId);
        }
    };

    return (
        <div className={classes.welcome}>
            <Stack className={classes['welcome-content']}>
                <Stack className={classes['welcome-heading']} gap="xs">
                    <Title>{t('Welcome to Rail Map Toolkit')}</Title>
                    <Text>{t('WelcomePage.subtitle')}</Text>
                </Stack>

                <Stack className={classes['welcome-app-list']}>
                    {welcomeApps.map(app => {
                        const appName = assetEnablement[app.appId].name
                            .split(' - ')
                            .map(name => t(name))
                            .join(' - ');

                        return isMobilePortrait ? (
                            <MobileWelcomeAppCard
                                key={app.appId}
                                app={app}
                                appName={appName}
                                onOpenApp={handleOpenApp}
                                onOpenAppKeyDown={handleOpenAppKeyDown}
                            />
                        ) : (
                            <DesktopWelcomeAppCard
                                key={app.appId}
                                app={app}
                                appName={appName}
                                onOpenApp={handleOpenApp}
                                onOpenAppKeyDown={handleOpenAppKeyDown}
                            />
                        );
                    })}
                </Stack>
            </Stack>
        </div>
    );
}
