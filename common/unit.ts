export enum UnitType {
    AIRPORT = 'Airport',
    CITY = 'City',
    DOCK = 'Dock',
    FACTORY = 'Factory',
    HQ = 'HQ',
    INFANTRY = 'Infantry',
    TANK = 'Tank',
    JET = 'Jet',
    SHIP = 'Ship',
}

export enum PlayerColor {
    NEUTRAL = 'neutral',
    RED = 'red',
    BLUE = 'blue',
    GREEN = 'green',
    YELLOW = 'yellow',
}

export const PlayerColors = [
    PlayerColor.RED,
    PlayerColor.BLUE,
    PlayerColor.GREEN,
    PlayerColor.YELLOW,
];

export abstract class Unit {
    public readonly type!: UnitType;
    constructor(
        public readonly id: number,
        public x: number,
        public y: number,
        public player?: string,
    ) { }
}

export abstract class MovableUnit extends Unit {
    public maxMovementPoints!: number;
    public movementPoints!: number;
    public maxHealth!: number;
    public health!: number;
}

export class Tank extends Unit {
    public readonly type = UnitType.TANK;
    public static readonly cost = 1000;
    public maxMovementPoints = 3;
    public movementPoints = 3;
    public maxHealth = 10;
    public health = 10;
}

export class Infantry extends Unit {
    public readonly type = UnitType.INFANTRY;
    public static readonly cost = 1000;
    public maxMovementPoints = 2;
    public movementPoints = 2;
    public maxHealth = 3;
    public health = 3;
}

export class Jet extends Unit {
    public readonly type = UnitType.JET;
    public static readonly cost = 1000;
    public maxMovementPoints = 6;
    public movementPoints = 6;
    public maxHealth = 5;
    public health = 5;
}

export class Ship extends Unit {
    public readonly type = UnitType.SHIP;
    public static readonly cost = 1000;
    public maxMovementPoints = 5;
    public movementPoints = 5;
    public maxHealth = 10;
    public health = 10;
}

export abstract class Building extends Unit {
    public readonly income!: number;
    public readonly canBuild!: UnitType[];
}

export class City extends Building {
    public readonly type = UnitType.CITY;
    public readonly income = 1000;
}

export class Dock extends Building {
    public readonly type = UnitType.DOCK;
    public readonly income = 1000;
    public readonly canBuild = [UnitType.SHIP];
}

export class Factory extends Building {
    public readonly type = UnitType.FACTORY;
    public readonly income = 1000;
    public readonly canBuild = [UnitType.TANK, UnitType.INFANTRY];
}

export class Airport extends Building {
    public readonly type = UnitType.AIRPORT;
    public readonly income = 1000;
    public readonly canBuild = [UnitType.JET];
}

export class HQ extends Building {
    public readonly type = UnitType.HQ;
    public readonly income = 1000;
}