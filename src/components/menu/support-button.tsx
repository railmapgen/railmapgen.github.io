import {
    Button,
    Popover,
    PopoverAnchor,
    PopoverArrow,
    PopoverBody,
    PopoverCloseButton,
    PopoverContent,
    PopoverFooter,
    PopoverHeader,
} from '@chakra-ui/react';
import { MdHelp } from 'react-icons/md';
import { hideFontAdvice, NEVER, neverShowFontAdvice, setMenuView } from '../../redux/app/app-slice';
import { useTranslation } from 'react-i18next';
import { useRootDispatch, useRootSelector } from '../../redux';
import { useEffect, useState } from 'react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { LocalStorageKey } from '../../util/constants';

export default function SupportButton() {
    const { t } = useTranslation();

    const dispatch = useRootDispatch();
    const { isShowMenu, showFontAdvice } = useRootSelector(state => state.app);

    const [deferredShowTip, setDeferredShowTip] = useState(isShowMenu && showFontAdvice === 'show');

    useEffect(() => {
        let timeoutId: number;
        if (isShowMenu && showFontAdvice === 'show') {
            timeoutId = window.setTimeout(() => {
                setDeferredShowTip(true);
            }, 5000);
        } else {
            setDeferredShowTip(false);
        }

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [isShowMenu, showFontAdvice]);

    return (
        <Popover isOpen={deferredShowTip} onClose={() => dispatch(hideFontAdvice())}>
            <PopoverAnchor>
                <Button
                    variant="ghost"
                    size="sm"
                    w="100%"
                    leftIcon={<MdHelp />}
                    onClick={() => {
                        dispatch(setMenuView('support'));
                        dispatch(hideFontAdvice());
                    }}
                >
                    {t('Help & support')}
                </Button>
            </PopoverAnchor>
            <PopoverContent>
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader>💡 {t('Pro tip')}</PopoverHeader>
                <PopoverBody>{t('Fonts are slow to load? Learn how to speed it up!')}</PopoverBody>
                <PopoverFooter display="flex">
                    <Button
                        variant="ghost"
                        size="sm"
                        ml="auto"
                        onClick={() => {
                            dispatch(neverShowFontAdvice());
                            rmgRuntime.storage.set(LocalStorageKey.SHOW_FONT_ADVICE, NEVER);
                        }}
                    >
                        {t("Don't show again")}
                    </Button>
                    <Button
                        variant="solid"
                        colorScheme="primary"
                        size="sm"
                        ml={2}
                        onClick={() => dispatch(hideFontAdvice())}
                    >
                        {t('OK')}
                    </Button>
                </PopoverFooter>
            </PopoverContent>
        </Popover>
    );
}
