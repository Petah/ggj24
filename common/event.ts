export enum EventType {
    GAME_LIST_REQUEST = 'game_list_request',
    GAME_LIST_RESPONSE = 'game_list_response',
    JOIN_GAME_REQUEST = 'join_game_request',
    JOIN_GAME_RESPONSE = 'join_game_response',
    PLAYER_JOINED = 'player_joined',
    END_TURN = 'end_turn',
    GAME_STATE_UPDATE = 'game_state_update',
    START_GAME = 'start_game',
    ERROR = 'error',

    // Client only events
    GAME_STATE_CHANGE = 'game_state_change',
}

export interface IEvent {
    type?: EventType;
}
