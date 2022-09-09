import React from 'react';
import { Heading, HStack, IconButton, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { RmgEnvBadge, RmgWindowHeader } from '@railmapgen/rmg-components';
import { handleLanguageChange } from '../i18n/config';
import { MdMenu, MdTranslate } from 'react-icons/md';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useTranslation } from 'react-i18next';
import { LanguageCode } from '@railmapgen/rmg-translate';
import { useRootDispatch } from '../redux';
import { toggleMenu } from '../redux/app/app-slice';

export default function WindowHeader() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const handleSelectLanguage = (language: LanguageCode) => {
        rmgRuntime.setLanguage(language);
        handleLanguageChange(language);
    };

    return (
        <RmgWindowHeader>
            <IconButton
                variant="ghost"
                size="sm"
                aria-label={t('Toggle menu')}
                title={t('Toggle menu')}
                icon={<MdMenu />}
                ml={-2}
                mr={1}
                onClick={() => dispatch(toggleMenu())}
            />
            <Heading as="h4" size="md">
                {t('RMG Home')}
            </Heading>
            <RmgEnvBadge environment={rmgRuntime.getEnv()} version={rmgRuntime.getAppVersion()} />

            <HStack ml="auto">
                <Menu>
                    <MenuButton as={IconButton} icon={<MdTranslate />} variant="ghost" size="sm" />
                    <MenuList>
                        <MenuItem onClick={() => handleSelectLanguage(LanguageCode.English)}>English</MenuItem>
                        <MenuItem onClick={() => handleSelectLanguage(LanguageCode.ChineseSimp)}>简体中文</MenuItem>
                        <MenuItem onClick={() => handleSelectLanguage(LanguageCode.ChineseTrad)}>繁體中文</MenuItem>
                    </MenuList>
                </Menu>
            </HStack>
        </RmgWindowHeader>
    );
}
