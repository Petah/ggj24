import { Client } from './client';

export class Unit {
    public x: number = 0;
    public y: number = 0;
}

export class Player {
    public units: Unit[] = [];

    constructor(
        public name: string,
        public client: Client,
    ) {

    };
}
