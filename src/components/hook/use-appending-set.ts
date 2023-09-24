import { useState } from 'react';

export default function useAppendingSet<T>(initialValue?: T[]): [T[], (chunk: T[]) => void] {
    const [list, setList] = useState(initialValue ?? []);

    const appendToSet = (chunk: T[]) => {
        setList(prevState => {
            const contributorSet = new Set(prevState ? prevState.concat(chunk) : chunk);
            return Array.from(contributorSet);
        });
    };

    return [list, appendToSet];
}
