abstract class Unit {
    public maxMovementPoints: number;
    public movementPoints: number;
    public maxHealth: number;
    public health: number;
    public x: number;
    public y: number;
}

export class Tank extends Unit {
    public maxMovementPoints = 3;
    public movementPoints = 3;
    public maxHealth = 10;
    public health = 10;
}

export class Infantry extends Unit {
    public maxMovementPoints = 2;
    public movementPoints = 2;
    public maxHealth = 3;
    public health = 3;
}

export class Jet extends Unit {
    public maxMovementPoints = 6;
    public movementPoints = 6;
    public maxHealth = 5;
    public health = 5;
}
// [{
//     type: 'City',
//     frame: 8,
//     key: 'tiles2',
// }, {
//     type: 'Dock',
//     frame: 12,
//     key: 'tiles2',
// }, {
//     type: 'Factory',
//     frame: 11,
//     key: 'tiles2',
// }, {
//     type: 'Airport',
//     frame: 15,
//     key: 'tiles2',
// }, {
//     type: 'HQ',
//     frame: 9,
//     key: 'tiles2',
// }
class Building {
    public x: number;
    public y: number;
}

export class City extends Building {
}

export class Dock extends Building {
}

export class Factory extends Building {
}

export class Airport extends Building {
}

export class HQ extends Building {
}