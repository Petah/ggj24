import { UnitType } from 'common/unit';

export interface TileMap {
    width: number;
    height: number;
    layers: {
        name: string;
        data: number[];
        objects: {
            gid: number;
            height: number;
            id: number;
            name: string;
            rotation: number;
            type: UnitType;
            visible: boolean;
            width: number;
            x: number;
            y: number;
            properties?: {
                name: string;
                type: string;
                value: string;
            }[];
        }[];
    }[];
}