import rmgRuntime from '@railmapgen/rmg-runtime';
import { useRootDispatch, useRootSelector } from '../../redux';
import { openTempApp, toggleMenu } from '../../redux/app/app-slice';
import useSmMediaQuery from './use-sm-media-query';

export default function useOpenTempApp() {
    const dispatch = useRootDispatch();
    const isShowMenu = useRootSelector(state => state.app.isShowMenu);
    const smMediaQuery = useSmMediaQuery();

    return (appId: string) => {
        dispatch(openTempApp(appId));
        if (!smMediaQuery && isShowMenu) {
            dispatch(toggleMenu());
            rmgRuntime.toggleNavMenu(false);
        }
    };
}
