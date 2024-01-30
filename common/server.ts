import { IClient } from "./client";
import { IEvent } from "./event";

export interface IServer {
    handleEvent(client: IClient, event: IEvent): Promise<void>;
}