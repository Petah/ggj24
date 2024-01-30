import { IEvent } from "./event";

export interface IClient {
    send(event: IEvent): void;
}
