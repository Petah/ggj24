import { ClientType, IClient } from './client';
import { EventType, IEvent } from './event';
import { CaptureRequest, CaptureResponse, EndTurn, GameStateUpdate, MoveUnitRequest, MoveUnitResponse, WaitRequest, WaitResponse } from './events/turn';
import { logError, logInfo } from './log';
import { GameState } from './events/game-list';
import { Building, MovableUnit, Tank, Unit, UnitType, UnitTypeMap, UnitTypePurchasable, isBuilding, isMoveableUnit } from './unit';
import { getPathFinder } from './map';
import { PurchaseUnitRequest, PurchaseUnitResponse } from './events/unit-purchase';
import { Path } from './pf/finders/AStarFinder';
import { IServer } from './server';

interface AiState {
    tick: number;
    thinking: boolean;
    maxTurns: number;
}

export class Ai implements IClient {
    public type = ClientType.AI;
    public state: AiState = {
        tick: 0,
        thinking: false,
        maxTurns: 1000000,
    };

    public constructor(
        public playerName: string,
        private server?: IServer,
        state: Partial<AiState> = {},
    ) {
        this.state = { ...this.state, ...state };
    }

    public async send(event: IEvent) {
        try {
            let response: IEvent | undefined;
            switch (event.type) {
                case EventType.GAME_STATE_UPDATE:
                    response = await this.handleGameStateUpdate(event as GameStateUpdate);
                    break;
                case EventType.MOVE_UNIT_RESPONSE:
                    response = await this.handleGameStateUpdate(event as MoveUnitResponse);
                    break;
                case EventType.PURCHASE_UNIT_RESPONSE:
                    response = await this.handleGameStateUpdate(event as PurchaseUnitResponse);
                    break;
                case EventType.CAPTURE_RESPONSE:
                    response = await this.handleGameStateUpdate(event as CaptureResponse);
                    break;
                case EventType.WAIT_RESPONSE:
                    response = await this.handleGameStateUpdate(event as WaitResponse);
                    break;
            }
            if (response) {
                this.server?.handleEvent(this, response);
            }
        } catch (error) {
            logError('Error handling AI event', this.playerName, event, error);
        }
    }

    public async handleGameStateUpdate({ type, game }: { type: EventType, game: GameState }): Promise<IEvent | undefined> {
        if (this.state.tick > game.tick) {
            return;
        }
        if (this.state.tick !== game.tick) {
            this.state.tick = game.tick;
            this.state.thinking = true;
        }

        if (!this.isOurTurn(game)) {
            return;
        }
        console.log('AI', type, this.playerName, 'turn', game.turn, game.currentPlayer, 'units', game.units.length, this.state);

        if (game.turn > this.state.maxTurns) {
            logInfo('AI', this.playerName, 'turn', game.turn, 'max turns reached');
            return;
        }

        let event: IEvent | undefined;
        if (event = await this.buildUnits(game)) {
            logInfo('AI', this.playerName, 'buildUnits', event);
            return event;
        }
        if (event = await this.moveTank(game)) {
            logInfo('AI', this.playerName, 'moveTank', event);
            return event;
        }
        if (event = await this.moveInfantry(game)) {
            logInfo('AI', this.playerName, 'moveInfantry', event);
            return event;
        }

        this.state.thinking = false;

        return new EndTurn();
    }

    public isOurTurn(game: GameState) {
        return game.currentPlayer === this.playerName;
    }

    public async buildUnits(game: GameState): Promise<IEvent | undefined> {
        const money = game.players.find(player => player.name === this.playerName)!.money;
        if (money < 1000) {
            return;
        }
        const factories = game.units.filter(unit => unit.type === UnitType.FACTORY && unit.player === this.playerName) as Building[];
        console.log('factories', factories)
        for (const factory of factories) {
            const unitOnTop = game.units.find(unit => unit.x === factory.x && unit.y === factory.y && unit.id !== factory.id);
            if (unitOnTop) {
                continue;
            }
            let mostExpensive: typeof MovableUnit | undefined;
            let mostExpensiveType: UnitTypePurchasable | undefined;
            for (const unitType of factory.canBuild) {
                const unit = UnitTypeMap[unitType] as typeof MovableUnit;
                if (money >= unit.cost && (!mostExpensive || unit.cost > mostExpensive.cost)) {
                    mostExpensive = unit;
                    mostExpensiveType = unitType;
                }
            }
            if (mostExpensiveType) {
                return new PurchaseUnitRequest(factory.id, mostExpensiveType);
            }
        }
    }

    public async moveInfantry(game: GameState): Promise<IEvent | undefined> {
        const infantry = game.units.find(unit => unit.canCapture && unit.movementPoints > 0 && unit.player === this.playerName);
        if (!infantry) {
            return;
        }
        const { finder, grid } = getPathFinder(infantry, game.tiles, game.units, this.playerName);

        const enemies = game.units.filter(unit => unit.player !== this.playerName);
        let closestEnemy: Unit | undefined;
        let closestEnemyDistance: number = Infinity;
        let closestEnemyPath: Path | undefined;
        for (const enemy of enemies) {
            if (isBuilding(enemy)) {
                const unitOnTop = game.units.find(unit => unit.x === enemy.x && unit.y === enemy.y && unit.id !== enemy.id && unit.id !== infantry.id);
                if (unitOnTop) {
                    continue;
                }
            }
            const path = finder.findPath(infantry.x, infantry.y, enemy.x, enemy.y, grid.clone());
            if (!closestEnemy || path.length > 0 && path.length < closestEnemyDistance) {
                closestEnemy = enemy;
                closestEnemyDistance = path.length;
                closestEnemyPath = path;
            }
        }

        if (isBuilding(closestEnemy) && closestEnemyDistance <= 1) {
            return new CaptureRequest(infantry.id, closestEnemy.x, closestEnemy.y);
        } else if (closestEnemy) {
            closestEnemyPath!.shift();
            if (closestEnemyPath!.length > infantry.movementPoints) {
                closestEnemyPath!.splice(infantry.movementPoints);
            }
            while (closestEnemyPath!.length > 0) {
                const lastPosition = closestEnemyPath!.pop()!;
                const unitAtPosition = game.units.find(unit => unit.x === lastPosition[0] && unit.y === lastPosition[1] && isMoveableUnit(unit));
                if (!unitAtPosition) {
                    return new MoveUnitRequest(infantry.id, lastPosition[0], lastPosition[1]);
                }
            }
        }
        return new WaitRequest(infantry.id);
    }

    public async moveTank(game: GameState): Promise<IEvent | undefined> {
        const tanks = [UnitType.TANK, UnitType.ROCKET_TRUCK, UnitType.JET, UnitType.HELICOPTER];
        const tank = game.units.find(unit => tanks.indexOf(unit.type) !== -1 && unit.movementPoints > 0 && unit.player === this.playerName);
        if (!tank) {
            return;
        }
        return this.processTank(tank as Tank, game);
    }

    public async processTank(tank: Tank, game: GameState): Promise<IEvent | undefined> {
        const { finder, grid } = getPathFinder(tank, game.tiles, game.units, this.playerName);

        const enemies = game.units.filter(unit => unit.player !== this.playerName);
        let closestEnemy: Unit | undefined;
        let closestEnemyDistance: number = Infinity;
        let closestEnemyPath: Path | undefined;
        for (const enemy of enemies) {
            if (isBuilding(enemy)) {
                continue;
            }
            const path = finder.findPath(tank.x, tank.y, enemy.x, enemy.y, grid.clone().setWalkableAt(enemy.x, enemy.y, true));
            if (!closestEnemy || path.length > 0 && path.length < closestEnemyDistance) {
                closestEnemy = enemy;
                closestEnemyDistance = path.length;
                closestEnemyPath = path;
            }
        }

        if (closestEnemy) {
            closestEnemyPath!.shift();
            if (closestEnemyPath!.length > tank.movementPoints) {
                closestEnemyPath!.splice(tank.movementPoints);
            }
            while (closestEnemyPath!.length > 0) {
                const lastPosition = closestEnemyPath!.pop()!;
                const unitAtPosition = game.units.find(unit => unit.x === lastPosition[0] && unit.y === lastPosition[1] && isMoveableUnit(unit));
                if (!unitAtPosition) {
                    return new MoveUnitRequest(tank.id, lastPosition[0], lastPosition[1]);
                }
            }
        }
        return new WaitRequest(tank.id);
    }
}
