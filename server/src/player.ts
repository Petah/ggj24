import { Client } from './client';
import { PlayerColor, Unit } from '../../common/unit';

export class Player {
    public units: Unit[] = [];
    public money: number = 0;

    constructor(
        public name: string,
        public client: Client | undefined,
        public color: PlayerColor,
    ) {

    };
}
