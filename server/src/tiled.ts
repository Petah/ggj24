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
    tilesets: ({
        source: string;
        firstgid: number;
    } | TileSet)[];
}

export interface TileSet {
    firstgid: number;
    columns: number;
    image: string;
    imageheight: number;
    imagewidth: number;
    margin: number;
    name: string;
    spacing: number;
    tilecount: number;
    tiledversion: string;
    tileheight: number;
    tilewidth: number;
    type: string;
    version: string;
    tiles: {
        id: number;
        probability: number;
        properties: {
            name: string;
            type: string;
            value: string;
        }[];
    }[];
    wangsets: {
        cornercolors: string;
        cornercolors2: string;
        name: string;
        tile: number;
        wangtiles: {
            tileid: number;
            wangid: number[];
        }[];
    }[];
}