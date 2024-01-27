import exp from "constants";

export enum UnitType {
    AIRPORT = 'Airport',
    CITY = 'City',
    DOCK = 'Dock',
    FACTORY = 'Factory',
    HQ = 'HQ',
    INFANTRY = 'Infantry',
    ANTI_TANK = 'Anti-Tank',
    APC = 'APC',
    TANK = 'Tank',
    JET = 'Jet',
    HELICOPTER = 'Helicopter',
    TRANSPORT_COPTER = 'Transport Copter',
    SHIP = 'Ship',
    LANDER = 'Lander',
    ROCKET_TRUCK = 'Rocket Truck',
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

export function getDamageAmount(attackingUnit: MovableUnit, defendingUnit: MovableUnit): number {
    return getDamageAmountBase(attackingUnit, defendingUnit) * (attackingUnit.health / attackingUnit.maxHealth);
}

export function getDamageAmountBase(attackingUnit: MovableUnit, defendingUnit: MovableUnit): number {
    switch (attackingUnit.damageType) {
        case DamageType.MACHINE_GUN:
            switch (defendingUnit.armourType) {
                case ArmourType.INFANTRY:
                    return 70;
                case ArmourType.LIGHT_VEHICLE:
                    return 30;
                case ArmourType.TANK:
                case ArmourType.SHIP:
                    return 5;
                case ArmourType.HELICOPTER:
                    return 40;
                case ArmourType.PLANE:
                    return 0;
            }
            break;
        case DamageType.BAZOOKA:
            switch (defendingUnit.armourType) {
                case ArmourType.INFANTRY:
                    return 90;
                case ArmourType.LIGHT_VEHICLE:
                    return 70;
                case ArmourType.TANK:
                case ArmourType.SHIP:
                    return 40;
                case ArmourType.HELICOPTER:
                    return 80;
                case ArmourType.PLANE:
                    return 50;
            }
            break;
        case DamageType.TANK_CANNON:
            switch (defendingUnit.armourType) {
                case ArmourType.INFANTRY:
                    return 100;
                case ArmourType.LIGHT_VEHICLE:
                    return 80;
                case ArmourType.TANK:
                case ArmourType.SHIP:
                    return 60;
                case ArmourType.HELICOPTER:
                    return 90;
                case ArmourType.PLANE:
                    return 70;
            }
            break;
        case DamageType.GROUND_ROCKETS:
            switch (defendingUnit.armourType) {
                case ArmourType.INFANTRY:
                    return 100;
                case ArmourType.LIGHT_VEHICLE:
                    return 90;
                case ArmourType.TANK:
                case ArmourType.SHIP:
                    return 80;
                case ArmourType.HELICOPTER:
                    return 100;
                case ArmourType.PLANE:
                    return 90;
            }
            break;
        case DamageType.MISSILES:
            switch (defendingUnit.armourType) {
                case ArmourType.INFANTRY:
                    return 100;
                case ArmourType.LIGHT_VEHICLE:
                    return 100;
                case ArmourType.TANK:
                case ArmourType.SHIP:
                    return 100;
                case ArmourType.HELICOPTER:
                    return 100;
                case ArmourType.PLANE:
                    return 100;
            }
            break;
        case DamageType.BOMBS:
            switch (defendingUnit.armourType) {
                case ArmourType.INFANTRY:
                    return 100;
                case ArmourType.LIGHT_VEHICLE:
                    return 100;
                case ArmourType.TANK:
                case ArmourType.SHIP:
                    return 100;
                case ArmourType.HELICOPTER:
                    return 100;
                case ArmourType.PLANE:
                    return 100;
            }
            break;
    }
    return 50;
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
    public minRange = 1;
    public maxRange = 1;
    public canCapture = false;
    public canBeTransported = false;
    public isInTransport = false;
    public carryingCapacity = 0;
    public carriedUnits: MovableUnit[] = [];
    public hasCommittedActions: boolean = false;
}

export class Infantry extends MovableUnit {
    public readonly type = UnitType.INFANTRY;
    public static readonly cost = 1000;
    public maxMovementPoints = 3;
    public movementType = MovementType.INFANTRY;
    public damageType = DamageType.MACHINE_GUN;
    public armourType = ArmourType.INFANTRY;
    public canCapture = true;
    public canBeTransported = true;
}

export class AntiTank extends MovableUnit {
    public readonly type = UnitType.ANTI_TANK;
    public static readonly cost = 3000;
    public maxMovementPoints = 2;
    public movementType = MovementType.INFANTRY;
    public damageType = DamageType.BAZOOKA;
    public armourType = ArmourType.INFANTRY;
    public canCapture = true;
    public canBeTransported = true;
}

export class RocketTruck extends MovableUnit {
    public readonly type = UnitType.ROCKET_TRUCK;
    public static readonly cost = 9000;
    public minRange = 3;
    public maxRange = 5;
    public maxMovementPoints = 4;
    public movementType = MovementType.TREADS;
    public damageType = DamageType.GROUND_ROCKETS;
    public armourType = ArmourType.LIGHT_VEHICLE;
}

export class Tank extends MovableUnit {
    public readonly type = UnitType.TANK;
    public static readonly cost = 7000;
    public maxRange = 2;
    public maxMovementPoints = 6;
    public movementType = MovementType.TREADS;
    public damageType = DamageType.TANK_CANNON;
    public armourType = ArmourType.TANK;
}

export class APC extends MovableUnit {
    public readonly type = UnitType.APC;
    public static readonly cost = 4000;
    public maxMovementPoints = 30;
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

export class TransportCopter extends MovableUnit {
    public readonly type = UnitType.TRANSPORT_COPTER;
    public static readonly cost = 5000;
    public maxMovementPoints = 6;
    public movementType = MovementType.AIR;
    public armourType = ArmourType.HELICOPTER;
    public carryingCapacity = 1;
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
    public readonly canBuild = [UnitType.INFANTRY, UnitType.ANTI_TANK, UnitType.APC, UnitType.TANK, UnitType.ROCKET_TRUCK, UnitType.HELICOPTER, UnitType.JET];
}

export class Airport extends Building {
    public readonly type = UnitType.AIRPORT;
    public readonly canBuild = [UnitType.HELICOPTER, UnitType.TRANSPORT_COPTER, UnitType.JET];
}

export class HQ extends Building {
    public readonly type = UnitType.HQ;
}

export const UnitTypeMap: {
    [key in UnitType]: typeof Unit;
} = {
    [UnitType.INFANTRY]: Infantry,
    [UnitType.TANK]: Tank,
    [UnitType.SHIP]: Ship,
    [UnitType.JET]: Jet,
    [UnitType.HELICOPTER]: Helicopter,
    [UnitType.TRANSPORT_COPTER]: TransportCopter,
    [UnitType.APC]: APC,
    [UnitType.ANTI_TANK]: AntiTank,
    [UnitType.LANDER]: Lander,
    [UnitType.CITY]: City,
    [UnitType.DOCK]: Dock,
    [UnitType.FACTORY]: Factory,
    [UnitType.AIRPORT]: Airport,
    [UnitType.HQ]: HQ,
    [UnitType.ROCKET_TRUCK]: RocketTruck,
}

export function isBuilding(unit?: Unit): unit is Building {
    if (!unit) {
        return false;
    }
    switch (unit.type) {
        case UnitType.CITY:
        case UnitType.DOCK:
        case UnitType.FACTORY:
        case UnitType.AIRPORT:
        case UnitType.HQ:
            return true;
    }
    return false;
}

export function isMoveableUnit(unit?: Unit): unit is MovableUnit {
    if (!unit) {
        return false;
    }
    switch (unit.type) {
        case UnitType.INFANTRY:
        case UnitType.TANK:
        case UnitType.SHIP:
        case UnitType.JET:
        case UnitType.HELICOPTER:
        case UnitType.APC:
        case UnitType.ANTI_TANK:
        case UnitType.LANDER:
        case UnitType.ROCKET_TRUCK:
            return true;
    }
    return false;
}

export function isFactory(unit?: Unit): unit is Building {
    if (!unit) {
        return false;
    }
    switch (unit.type) {
        case UnitType.DOCK:
        case UnitType.FACTORY:
        case UnitType.AIRPORT:
            return true;
    }
    return false;
}