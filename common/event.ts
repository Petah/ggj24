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
    MOVE_UNIT_REQUEST = 'move_unit_request',
    MOVE_UNIT_RESPONSE = 'move_unit_response',
    RELOAD_GAME_STATE = 'reload_game_state',
    PURCHASE_UNIT_REQUEST = 'purchase_unit_request',
}

export interface IEvent {
    type?: EventType;
}
