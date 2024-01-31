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
    CAPTURE_REQUEST = 'capture_request',
    CAPTURE_RESPONSE = 'capture_response',
    RELOAD_GAME_STATE = 'reload_game_state',
    PURCHASE_UNIT_REQUEST = 'purchase_unit_request',
    PURCHASE_UNIT_RESPONSE = 'purchase_unit_response',
    ATTACK_UNIT_REQUEST = 'attack_unit_request',
    ATTACK_UNIT_RESPONSE = 'attack_unit_response',
    CREATE_GAME_REQUEST = 'create_game_request',
    WAIT_REQUEST = 'wait_request',
    WAIT_RESPONSE = 'wait_response',
    RESTART_GAME = 'restart_game',
}

export interface IEvent {
    type?: EventType;
}
