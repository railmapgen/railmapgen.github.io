export const SET_EXAMPLE_STATE = 'SET_EXAMPLE_STATE';

export interface setExampleStateAction {
    type: typeof SET_EXAMPLE_STATE;
    exampleState: string;
}

export const setExampleState = (exampleState: string): setExampleStateAction => {
    return { type: SET_EXAMPLE_STATE, exampleState };
};
