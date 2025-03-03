import classes from './workspace.module.css';
import { useEffect } from 'react';
import { useRootSelector } from '../../redux';
import Welcome from './welcome';
import AppContainer from './app-container';
import { useSearchParams } from 'react-router-dom';

type WorkspaceProps = {
    alwaysShowWelcome?: boolean;
};

export default function Workspace({ alwaysShowWelcome }: WorkspaceProps) {
    const { openedTabs, activeTab } = useRootSelector(state => state.app);

    const [, setSearchParams] = useSearchParams();

    useEffect(() => {
        if (activeTab) {
            const app = openedTabs.find(tab => tab.id === activeTab)?.app;
            if (app) {
                setSearchParams({ app });
            } else {
                setSearchParams({});
            }
        } else {
            setSearchParams({});
        }
    }, [activeTab]);

    return (
        <div className={classes.workspace}>
            {alwaysShowWelcome || openedTabs.length === 0 ? (
                <Welcome />
            ) : (
                openedTabs.map(tab => <AppContainer key={tab.id} tab={tab} isActive={activeTab === tab.id} />)
            )}
        </div>
    );
}
