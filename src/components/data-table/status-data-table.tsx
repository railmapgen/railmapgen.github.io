import { Badge } from '@chakra-ui/react';
import { RmgDataTable, RmgDataTableFieldType } from '@railmapgen/rmg-components';
import { useEffect, useState } from 'react';
import { getStatus, InfoStatus } from '../../service/info-service';

export default function StatusDataTable() {
    const [data, setData] = useState<InfoStatus[]>([]);

    useEffect(() => {
        getStatus().then(status => setData(status));
    }, []);

    const fields: RmgDataTableFieldType<InfoStatus>[] = [
        { label: 'Component', key: 'id' },
        { label: 'PROD Version', displayHandler: item => <Badge colorScheme="green">{item.prd}</Badge> },
        { label: 'UAT Version', displayHandler: item => <Badge colorScheme="orange">{item.uat}</Badge> },
    ];

    return <RmgDataTable data={data} fields={fields} />;
}
