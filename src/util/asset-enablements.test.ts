import { RmgEnv } from '@railmapgen/rmg-runtime';
import { getAvailableAsset } from './asset-enablements';

describe('AppStore asset availability', () => {
    it('keeps all bundled applications available when Apple builds switch from Tauri', () => {
        const apps = getAvailableAsset('app', RmgEnv.PRD, 'AppStore');

        expect(apps).toEqual(getAvailableAsset('app', RmgEnv.PRD, 'Tauri'));
        expect(apps).toEqual(
            expect.arrayContaining(['rmg', 'rmp', 'rma', 'rsg', 'rmg-templates', 'rmg-templates-upload', 'rmp-gallery'])
        );
    });

    it('does not expose website-only tools or download and mirror links in AppStore builds', () => {
        expect(getAvailableAsset('devtool', RmgEnv.PRD, 'AppStore')).toEqual([]);
        const links = getAvailableAsset('link', RmgEnv.PRD, 'AppStore');

        expect(links).toContain('mini-metro-web');
        for (const link of ['tauri', 'official-website', 'blog', 'github-pages', 'gitlab-pages', 'community-review']) {
            expect(links).not.toContain(link);
            expect(getAvailableAsset('link', RmgEnv.PRD, 'localhost')).toContain(link);
        }
    });
});
