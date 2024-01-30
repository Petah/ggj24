import { IClient } from 'common/client';
import { PlayerColor, Unit } from 'common/unit';

export class Player {
    public units: Unit[] = [];
    public money: number = 0;
    public hasLost: boolean = false;

    constructor(
        public name: string,
        public client: IClient,
        public color: PlayerColor,
    ) {

    };
}
