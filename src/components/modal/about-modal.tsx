import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { assetEnablement } from '../../util/asset-enablements';
import { getVersion } from '../../service/info-service';
import { Badge, Button, Modal } from '@mantine/core';

interface AboutModalProps {
    appId?: string;
    onClose: () => void;
}

export default function AboutModal(props: AboutModalProps) {
    const { appId, onClose } = props;
    const { t } = useTranslation();

    const [version, setVersion] = useState('Unknown');
    const component = appId ? assetEnablement[appId]?.url?.split('/')?.[1] : undefined;

    useEffect(() => {
        if (component) {
            getVersion(component).then(data => setVersion(data));
        } else {
            setVersion('Unknown');
        }
    }, [component]);

    return (
        <Modal
            opened={!!appId}
            onClose={onClose}
            size="xl"
            title={
                <>
                    {t('About') +
                        ' ' +
                        (appId
                            ? assetEnablement[appId].name
                                  .split(' - ')
                                  .map(n => t(n))
                                  .join(' - ')
                            : '')}
                    <Badge color="gray" radius="sm" ml="xs">
                        {version}
                    </Badge>
                </>
            }
        >
            <Button component="a" href={'https://github.com/railmapgen/' + component} target="_blank">
                {t('Visit GitHub')}
            </Button>
        </Modal>
    );
}
