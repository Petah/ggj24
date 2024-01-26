import { Client } from './client';

export class Player {
    constructor(
        public name: string,
        public client: Client,
    ) {

    };
}
