import { Client } from './client';
import { PlayerColor, Unit } from '../../common/unit';

export class Player {
    public units: Unit[] = [];

    constructor(
        public name: string,
        public client: Client | undefined,
        public color: PlayerColor,
    ) {

    };
}
