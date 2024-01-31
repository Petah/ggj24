import { ClientType } from './client';
import { PlayerColor } from './unit';

export class Player {
    public state: any = {};

    constructor(
        public clientType: ClientType,
        public name: string,
        public color: PlayerColor,
        public money: number = 0,
        public hasLost: boolean = false,
    ) {
    };
}
