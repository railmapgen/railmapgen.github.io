import { ActionIcon, Button, Card, Group, Text, Title } from '@mantine/core';
import { RMSection, RMSectionBody, RMSectionHeader } from '@railmapgen/mantine-components';
import { logger } from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDeleteOutline, MdOutlineSync, MdOutlineSyncAlt } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { fetchSaveList, logout, syncAfterLogin } from '../../../redux/account/account-slice';
import { addNotification } from '../../../redux/notification/notification-slice';
import { setLastChangedAtTimeStamp } from '../../../redux/rmp-save/rmp-save-slice';
import { apiFetch } from '../../../util/api';
import { API_ENDPOINT, APISaveList, SAVE_KEY } from '../../../util/constants';
import { getRMPSave, notifyRMPSaveChange, setRMPSave } from '../../../util/local-storage-save';
import InlineEdit from '../../common/inline-edit';

const MAXIMUM_FREE_SAVE = 1;
const MAXIMUM_SAVE = 10;

const SavesSection = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        isLoggedIn,
        token,
        activeSubscriptions,
        currentSaveId,
        saves: saveList,
    } = useRootSelector(state => state.account);
    const { lastChangedAtTimeStamp } = useRootSelector(state => state.rmpSave);

    const canCreateNewSave =
        isLoggedIn &&
        saveList &&
        (activeSubscriptions.RMP_CLOUD ? saveList.length < MAXIMUM_SAVE : saveList.length < MAXIMUM_FREE_SAVE);
    const firstSaveIdIfSubscriptionIsExpired = Math.min(...(saveList ?? []).map(s => s.id));
    const isUpdateDisabled = (saveId: number) =>
        !activeSubscriptions.RMP_CLOUD && saveId !== firstSaveIdIfSubscriptionIsExpired;

    const [syncButtonIsLoading, setSyncButtonIsLoading] = React.useState(undefined as number | undefined);
    const [deleteButtonIsLoading, setDeleteButtonIsLoading] = React.useState(undefined as number | undefined);

    const showErrorToast = (msg: string) =>
        dispatch(
            addNotification({
                title: t('Unable to sync your save'),
                message: msg,
                type: 'error',
                duration: 9000,
            })
        );

    const handleCreateNewSave = async () => {
        const save = await getRMPSave(SAVE_KEY.RMP);
        if (!isLoggedIn || !save || !token) {
            showErrorToast(t('Failed to get the RMP save!'));
            return;
        }
        const { data, hash } = save;
        const index = getRandomCity();
        try {
            const rep = await apiFetch(
                API_ENDPOINT.SAVES,
                {
                    method: 'POST',
                    body: JSON.stringify({ index, data, hash }),
                },
                token
            );
            if (rep.status === 401) {
                showErrorToast(t('Login status expired.'));
                dispatch(logout());
                return;
            }
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                return;
            }
            dispatch(fetchSaveList());
        } catch (e) {
            showErrorToast((e as Error).message);
        }
    };
    const handleSync = async (saveId: number) => {
        if (!isLoggedIn || !token) return;
        if (saveId === currentSaveId) {
            // current sync, either fetch cloud (a) or update cloud (b)
            setSyncButtonIsLoading(currentSaveId);
            if (!currentSaveId || isUpdateDisabled(currentSaveId)) {
                showErrorToast(t('Can not sync this save!'));
                setSyncButtonIsLoading(undefined);
                return;
            }

            // fetch cloud save metadata
            const savesRep = await dispatch(fetchSaveList());
            if (savesRep.meta.requestStatus !== 'fulfilled') {
                showErrorToast(t('Login status expired.')); // TODO: also might be !200 response
                setSyncButtonIsLoading(undefined);
                return;
            }
            const savesList = savesRep.payload as APISaveList;
            const cloudSave = savesList.saves.filter(save => save.id === currentSaveId).at(0);
            if (!cloudSave) {
                showErrorToast(t(`Current save id is not in saveList!`));
                // TODO: ask sever to reconstruct currentSaveId
                setSyncButtonIsLoading(undefined);
                return;
            }
            const lastUpdateAt = new Date(cloudSave.lastUpdateAt);
            const lastChangedAt = new Date(lastChangedAtTimeStamp);
            // a. if cloud save is newer, fetch and set the cloud save to local
            if (lastChangedAt < lastUpdateAt) {
                logger.warn(`Save id: ${currentSaveId} is newer in the cloud via local compare.`);
                // TODO: There is no compare just fetch and set the cloud save to local
                // might be better to have a dedicated thunk action for this
                dispatch(syncAfterLogin());
                setSyncButtonIsLoading(undefined);
                return;
            }

            // b. local save is newer, update the cloud save
            const save = await getRMPSave(SAVE_KEY.RMP);
            if (!save) {
                showErrorToast(t('Failed to get the RMP save!'));
                setSyncButtonIsLoading(undefined);
                return;
            }
            const { data, hash } = save;
            const rep = await apiFetch(
                API_ENDPOINT.SAVES + '/' + currentSaveId,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ data, hash }),
                },
                token
            );
            if (rep.status === 401) {
                showErrorToast(t('Login status expired.'));
                setSyncButtonIsLoading(undefined);
                dispatch(logout());
                return;
            }
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                setSyncButtonIsLoading(undefined);
                return;
            }
            setSyncButtonIsLoading(undefined);
        } else {
            // sync another save slot
            setSyncButtonIsLoading(saveId);
            const rep = await apiFetch(API_ENDPOINT.SAVES + '/' + saveId, {}, token);
            if (rep.status === 401) {
                showErrorToast(t('Login status expired.'));
                setSyncButtonIsLoading(undefined);
                dispatch(logout());
                return;
            }
            if (rep.status !== 200) {
                showErrorToast(await rep.text());
                setSyncButtonIsLoading(undefined);
                return;
            }
            logger.info(`Set ${SAVE_KEY.RMP} with save id: ${saveId}`);
            setRMPSave(SAVE_KEY.RMP, await rep.text());
            dispatch(setLastChangedAtTimeStamp(new Date().valueOf()));
            notifyRMPSaveChange();
            setSyncButtonIsLoading(undefined);
        }
        dispatch(fetchSaveList());
    };
    const handleDeleteSave = async (saveId: number) => {
        if (!isLoggedIn || !saveId || !token) return;
        setDeleteButtonIsLoading(saveId);
        const rep = await apiFetch(API_ENDPOINT.SAVES + '/' + currentSaveId, { method: 'DELETE' }, token);
        if (rep.status === 401) {
            showErrorToast(t('Login status expired.'));
            setDeleteButtonIsLoading(undefined);
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            setDeleteButtonIsLoading(undefined);
            return;
        }
        dispatch(fetchSaveList());
        setDeleteButtonIsLoading(undefined);
    };
    const handleEditSaveName = async (saveId: number, newName: string) => {
        if (!isLoggedIn || !saveId || !token) return;
        const rep = await apiFetch(
            `${API_ENDPOINT.SAVES}/${saveId}/metadata`,
            { method: 'PATCH', body: JSON.stringify({ index: newName }) },
            token
        );
        if (rep.status === 401) {
            showErrorToast(t('Login status expired.'));
            dispatch(logout());
            return;
        }
        if (rep.status !== 200) {
            showErrorToast(await rep.text());
            return;
        }
        dispatch(fetchSaveList());
    };

    return (
        <RMSection>
            <RMSectionHeader align="center">
                <Title order={3} size="h5" flex="1">
                    {t('Synced saves')}
                </Title>
                <Button variant="subtle" size="xs" ml="xs" disabled={!canCreateNewSave} onClick={handleCreateNewSave}>
                    {canCreateNewSave ? t('Create') : t('Subscribe to sync more')}
                </Button>
            </RMSectionHeader>

            <RMSectionBody direction="column" gap="xs">
                {saveList?.map(_ => (
                    <Card key={_.id} withBorder shadow="sm">
                        <Group>
                            <InlineEdit
                                initialValue={_.index}
                                onSave={val => handleEditSaveName(_.id, val)}
                                textInputWidth="207px"
                            />
                            <ActionIcon
                                disabled={isUpdateDisabled(_.id)}
                                loading={syncButtonIsLoading === _.id}
                                onClick={() => handleSync(_.id)}
                                title={_.id === currentSaveId ? t('Sync now') : t('Sync this slot')}
                            >
                                {_.id === currentSaveId ? <MdOutlineSync /> : <MdOutlineSyncAlt />}
                            </ActionIcon>
                            <ActionIcon
                                color="red"
                                loading={deleteButtonIsLoading === _.id}
                                onClick={() => handleDeleteSave(_.id)}
                                title={t('Delete')}
                            >
                                <MdDeleteOutline />
                            </ActionIcon>
                        </Group>
                        <Group justify="space-between" mt="md" mb="md">
                            <Text>
                                {t('ID')}: {_.id}
                            </Text>
                            <Text>
                                {t('Status')}: {_.id === currentSaveId ? t('Current save') : t('Cloud save')}
                            </Text>
                        </Group>
                        <Text>
                            {t('Last update at')}: {new Date(_.lastUpdateAt).toLocaleString()}
                        </Text>
                    </Card>
                ))}
            </RMSectionBody>
        </RMSection>
    );
};

export default SavesSection;

const CITIES_LIST = [
    'Tokyo',
    'Paris',
    'London',
    'New York',
    'Shanghai',
    'Dubai',
    'Sydney',
    'Rio de Janeiro',
    'Cairo',
    'Moscow',
    'Rome',
    'Berlin',
    'Madrid',
    'Seoul',
    'Singapore',
    'Hong Kong',
    'Beijing',
    'Mexico City',
    'Buenos Aires',
    'Istanbul',
    'Lagos',
    'Jakarta',
    'Osaka',
    'Manila',
    'Chongqing',
    'Karachi',
    'Dhaka',
    'Lima',
    'Bangkok',
    'Lahore',
    'Ho Chi Minh City',
    'Shenzhen',
    'Tianjin',
    'Taipei',
    'Bogota',
    'Baghdad',
    'Riyadh',
    'Santiago',
    'Guangzhou',
    'Yangon',
    'Johannesburg',
    'Toronto',
    'Montreal',
    'Vancouver',
    'Sao Paulo',
    'Kuala Lumpur',
    'Athens',
    'Lisbon',
    'Dublin',
    'Amsterdam',
    'Vienna',
    'Prague',
    'Budapest',
    'Warsaw',
    'Stockholm',
    'Oslo',
    'Helsinki',
    'Copenhagen',
    'Brussels',
    'Geneva',
    'Zurich',
    'Barcelona',
    'Milan',
    'Florence',
    'Venice',
    'Munich',
    'Hamburg',
    'Frankfurt',
    'Kyoto',
    'Nairobi',
    'Cape Town',
    'Casablanca',
    'Marrakesh',
    'Accra',
    'Addis Ababa',
    'Alexandria',
    'Ankara',
    'Jerusalem',
    'Tel Aviv',
    'Beirut',
    'Abu Dhabi',
    'Doha',
    'Kuwait City',
    'Muscat',
    'Amman',
    'Baku',
    'Tbilisi',
    'Yerevan',
    'Almaty',
    'Tashkent',
    'Kabul',
    'Tehran',
    'Damascus',
    "Sana'a",
    'Aden',
    'Manama',
    'Jeddah',
    'Mecca',
    'Medina',
    'Salalah',
    'Nicosia',
    'Thessaloniki',
    'Sofia',
    'Bucharest',
    'Belgrade',
    'Zagreb',
    'Sarajevo',
    'Skopje',
    'Tirana',
    'Pristina',
    'Podgorica',
    'Ljubljana',
    'Bratislava',
    'Krakow',
    'Gdansk',
    'Wroclaw',
    'Poznan',
    'Vilnius',
    'Riga',
    'Tallinn',
    'Reykjavik',
    'Manchester',
    'Birmingham',
    'Glasgow',
    'Edinburgh',
    'Cardiff',
    'Belfast',
    'Marseille',
    'Lyon',
    'Toulouse',
    'Nice',
    'Nantes',
    'Strasbourg',
    'Bordeaux',
    'Lille',
    'Cologne',
    'Stuttgart',
    'Dusseldorf',
    'Dortmund',
    'Essen',
    'Leipzig',
    'Dresden',
    'Hanover',
    'Nuremberg',
    'Bremen',
    'Rotterdam',
    'The Hague',
    'Utrecht',
    'Eindhoven',
    'Porto',
    'Valencia',
    'Seville',
    'Zaragoza',
    'Malaga',
    'Murcia',
    'Palma de Mallorca',
    'Las Palmas de Gran Canaria',
    'Antwerp',
    'Ghent',
    'Charleroi',
    'Liège',
    'Bern',
    'Basel',
    'Lausanne',
    'Graz',
    'Linz',
    'Salzburg',
    'Innsbruck',
    'Naples',
    'Turin',
    'Palermo',
    'Genoa',
    'Bologna',
    'Bari',
    'Catania',
    'Verona',
    'Melbourne',
    'Brisbane',
    'Perth',
    'Adelaide',
    'Gold Coast',
    'Canberra',
    'Auckland',
    'Wellington',
    'Christchurch',
    'Dunedin',
    'Suva',
    'Port Moresby',
    'Noumea',
    'Papeete',
    'Honolulu',
    'Quezon City',
    'Davao City',
    'Cebu City',
    'Chiang Mai',
    'Phuket',
    'George Town',
    'Ipoh',
    'Johor Bahru',
    'Surabaya',
    'Bandung',
    'Medan',
    'Semarang',
    'Santiago',
    'Lima',
    'Bogota',
    'Caracas',
    'Quito',
    'La Paz',
    'Sucre',
    'Buenos Aires',
    'Cordoba',
    'Rosario',
    'Mendoza',
    'Valparaiso',
    'Concepcion',
    'Arequipa',
    'Trujillo',
    'Chiclayo',
    'Piura',
    'Medellin',
    'Cali',
    'Barranquilla',
    'Cartagena',
    'Maracaibo',
    'Valencia',
    'Barquisimeto',
    'Ciudad Guayana',
    'Guayaquil',
    'Cuenca',
    'Santo Domingo',
    'Santa Cruz de la Sierra',
    'Cochabamba',
    'Guadalajara',
    'Monterrey',
    'Puebla',
    'Tijuana',
    'Leon',
    'Juarez',
    'Ecatepec',
    'Zapopan',
    'Nezahualcoyotl',
    'Chihuahua',
    'Naucalpan',
    'Merida',
    'Aguascalientes',
    'San Luis Potosi',
    'Hermosillo',
    'Saltillo',
    'Mexicali',
    'Culiacan',
    'Acapulco',
    'Guadalupe',
    'Cancun',
    'Torreon',
    'El Paso',
    'Tucson',
    'Phoenix',
    'Los Angeles',
    'San Diego',
    'San Jose',
    'San Francisco',
    'Seattle',
    'Portland',
    'Las Vegas',
    'Denver',
    'Chicago',
    'Houston',
    'Dallas',
    'San Antonio',
    'Austin',
    'Philadelphia',
    'Washington D.C.',
    'Boston',
    'Miami',
    'Atlanta',
    'Orlando',
    'Tampa',
    'Detroit',
    'Cleveland',
    'Minneapolis',
    'St. Louis',
    'Kansas City',
    'New Orleans',
    'Charlotte',
    'Nashville',
    'Indianapolis',
    'Columbus',
    'Cincinnati',
    'Pittsburgh',
    'Milwaukee',
    'Calgary',
    'Edmonton',
    'Winnipeg',
    'Ottawa',
    'Quebec City',
    'Halifax',
    'Chengdu',
    'Wuhan',
    'Hangzhou',
    'Suzhou',
    'Xian',
    'Nanjing',
    'Zhengzhou',
    'Jinan',
    'Qingdao',
    'Hefei',
    'Fuzhou',
    'Xiamen',
    'Ningbo',
    'Wuxi',
    'Kunming',
    'Changsha',
    'Nanchang',
    'Shijiazhuang',
    'Harbin',
    'Changchun',
    'Taiyuan',
    'Urumqi',
    'Lanzhou',
    'Yinchuan',
    'Xining',
    'Guiyang',
    'Lhasa',
    'Hohhot',
    'Nanning',
    'Haikou',
    'Sanya',
    'Zhuhai',
    'Foshan',
    'Dongguan',
    'Zhongshan',
    'Shantou',
    'Wenzhou',
    'Jiaxing',
    'Shaoxing',
    'Taizhou',
    'Jinhua',
    'Quanzhou',
    'Putian',
    'Zhangzhou',
    'Longyan',
    'Sanming',
    'Nanping',
    'Yingtan',
    'Shangrao',
    'Jiujiang',
    'Jingdezhen',
    'Pingxiang',
    'Xinyu',
    'Yichun',
    'Ganzhou',
    'Qingyuan',
    'Shaoguan',
    'Heyuan',
    'Meizhou',
    'Shanwei',
    'Yangjiang',
    'Zhanjiang',
    'Maoming',
    'Zhaoqing',
    'Yunfu',
    'Laibin',
    'Chongzuo',
    'Hechi',
    'Baise',
    'Wuzhou',
    'Fangchenggang',
    'Qinzhou',
    'Beihai',
    'Guigang',
    'Yulin',
    'Cenxi',
    'Dongxing',
    'Anshan',
    'Fushun',
    'Jilin City',
    'Qiqihar',
    'Daqing',
    'Mudanjiang',
    'Jixi',
];

const getRandomCity = () => {
    const randomIndex = Math.floor(Math.random() * CITIES_LIST.length);
    return CITIES_LIST[randomIndex];
};
