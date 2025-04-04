import { useMediaQuery } from '@mantine/hooks';

export default function useSmMediaQuery() {
    const smMediaQuery = useMediaQuery(`(min-width: 36em)`);
    return smMediaQuery;
}
