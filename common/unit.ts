import exp from "constants";

export enum UnitType {
    AIRPORT = 'Airport',
    CITY = 'City',
    DOCK = 'Dock',
    FACTORY = 'Factory',
    HQ = 'HQ',
    INFANTRY = 'Infantry',
    ANTI_TANK_INFANTRY = 'Anti-Tank Infantry',
    APC = 'APC',
    TANK = 'Tank',
    JET = 'Jet',
    HELICOPTER = 'Helicopter',
    SHIP = 'Ship',
    LANDER = 'Lander',
}

export enum PlayerColor {
    NEUTRAL = 'neutral',
    RED = 'red',
    BLUE = 'blue',
    GREEN = 'green',
    YELLOW = 'yellow',
}

export enum MovementType {
    INFANTRY = 'infantry',
    WHEELS = "wheels",
    TREADS = "treads",
    SHIP = "ship",
    AIR = "air",
}

export enum DamageType {
    MACHINE_GUN = 'machine gun',
    BAZOOKA = 'bazooka',
    TANK_CANNON = 'tank cannon',
    GROUND_ROCKETS = 'rockets',
    MISSILES = 'missiles',
    BOMBS = 'bombs',
}

export enum ArmourType {
    INFANTRY = 'infantry',
    LIGHT_VEHICLE = 'light',
    TANK = 'tank',
    SHIP = 'ship',
    HELICOPTER = "copter",
    PLANE = "plane",
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
    public movementPoints: number = 0;
    public maxHealth: number = 100;
    public health: number = 100;
    public movementType!: MovementType;
    public damageType?: DamageType;
    public armourType!: ArmourType;
    public canCapture = false;
    public carryingCapacity = 0;
    public carriedUnits: MovableUnit[] = [];
}

export class Infantry extends MovableUnit {
    public readonly type = UnitType.INFANTRY;
    public static readonly cost = 1000;
    public maxMovementPoints = 3;
    public movementType = MovementType.INFANTRY;
    public damageType = DamageType.MACHINE_GUN;
    public armourType = ArmourType.INFANTRY;
    public canCapture = true;
}

export class AntiTankInfantry extends MovableUnit {
    public readonly type = UnitType.ANTI_TANK_INFANTRY;
    public static readonly cost = 3000;
    public maxMovementPoints = 2;
    public movementType = MovementType.INFANTRY;
    public damageType = DamageType.BAZOOKA;
    public armourType = ArmourType.INFANTRY;
    public canCapture = true;
}

export class Tank extends MovableUnit {
    public readonly type = UnitType.TANK;
    public static readonly cost = 7000;
    public maxMovementPoints = 6;
    public movementType = MovementType.TREADS;
    public damageType = DamageType.TANK_CANNON;
    public armourType = ArmourType.TANK;
}

export class APC extends MovableUnit {
    public readonly type = UnitType.APC;
    public static readonly cost = 4000;
    public maxMovementPoints = 6;
    public movementType = MovementType.WHEELS;
    public armourType = ArmourType.LIGHT_VEHICLE;
    public carryingCapacity = 1;
}

export class Helicopter extends MovableUnit {
    public readonly type = UnitType.HELICOPTER;
    public static readonly cost = 8000;
    public maxMovementPoints = 7;
    public movementType = MovementType.AIR;
    public damageType = DamageType.GROUND_ROCKETS;
    public armourType = ArmourType.HELICOPTER;
}

export class Jet extends MovableUnit {
    public readonly type = UnitType.JET;
    public static readonly cost = 20000;
    public maxMovementPoints = 9;
    public movementType = MovementType.AIR;
    public damageType = DamageType.GROUND_ROCKETS;
    public armourType = ArmourType.PLANE;
}

export class Lander extends MovableUnit {
    public readonly type = UnitType.SHIP;
    public static readonly cost = 15000;
    public maxMovementPoints = 7;
    public movementType = MovementType.SHIP;
    public damageType = DamageType.TANK_CANNON;
    public armourType = ArmourType.SHIP;
    public carryingCapacity = 2
}

export class Ship extends MovableUnit {
    public readonly type = UnitType.SHIP;
    public static readonly cost = 15000;
    public maxMovementPoints = 7;
    public movementType = MovementType.SHIP;
    public damageType = DamageType.TANK_CANNON;
    public armourType = ArmourType.SHIP;
}

export abstract class Building extends Unit {
    public readonly income: number = 1000;
    public readonly canBuild!: UnitType[];
    public maxCapturePoints = 20;
    public capturePoints = 20;
}

export class City extends Building {
    public readonly type = UnitType.CITY;
}

export class Dock extends Building {
    public readonly type = UnitType.DOCK;
    public readonly canBuild = [UnitType.LANDER, UnitType.SHIP];
}

export class Factory extends Building {
    public readonly type = UnitType.FACTORY;
    public readonly canBuild = [UnitType.INFANTRY, UnitType.ANTI_TANK_INFANTRY, UnitType.APC, UnitType.TANK];
}

export class Airport extends Building {
    public readonly type = UnitType.AIRPORT;
    public readonly canBuild = [UnitType.HELICOPTER, UnitType.JET];
}

export class HQ extends Building {
    public readonly type = UnitType.HQ;
}