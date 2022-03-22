import { SET_EXAMPLE_STATE, setExampleStateAction } from './action';

interface AppState {
    exampleState: string;
}

const initialState: AppState = {
    exampleState: 'example',
};

export default function AppReducer(state = initialState, action: setExampleStateAction): AppState {
    switch (action.type) {
        case SET_EXAMPLE_STATE:
            state.exampleState = action.exampleState;
            break;
        default:
            break;
    }
    return { ...state };
}
