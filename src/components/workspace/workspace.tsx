import React, { useEffect } from 'react';
import { useRootSelector } from '../../redux';
import Welcome from './welcome';
import AppContainer from './app-container';
import { useSearchParams } from 'react-router-dom';

export default function Workspace() {
    const { openedTabs, activeTab } = useRootSelector(state => state.app);

    const [_, setSearchParams] = useSearchParams();

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

    if (openedTabs.length === 0) {
        return <Welcome />;
    }

    return (
        <>
            {openedTabs.map(tab => (
                <AppContainer key={tab.id} tab={tab} isActive={activeTab === tab.id} />
            ))}
        </>
    );
}
