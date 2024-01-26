export interface TileMap {
    width: number;
    height: number;
    layers: {
        name: string;
        data: number[];
    }[];
}