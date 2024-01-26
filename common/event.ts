export enum EventType {
    GAME_LIST_REQUEST = 'game_list_request',
    GAME_LIST_RESPONSE = 'game_list_response',
    JOIN_GAME_REQUEST = 'join_game_request',
    JOIN_GAME_RESPONSE = 'join_game_response',
    PLAYER_JOINED = 'player_joined',
}

export interface IEvent {
    type?: EventType;
}
