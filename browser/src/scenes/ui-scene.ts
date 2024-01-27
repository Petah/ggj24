import { InGame, UnitSprites } from './in-game';
import { client } from '../client';
import { GameButton } from '../button';
import { AntiTank, Infantry, PlayerColor, Tank, Unit, UnitType, UnitTypeMap } from '../../../common/unit';
import { isOurTurn, state } from '../state';
import { Building, MovableUnit, isBuilding, isMoveableUnit } from '../../../common/unit';
import { EndTurn, ReloadGameState, StartGame } from '../../../common/events/turn';
import { ucFirst } from '../../../common/util';

export class UI extends Phaser.Scene {

    private text!: Phaser.GameObjects.Text;

    private startGameButton!: GameButton;
    private endTurnButton!: GameButton;
    private menuBackground!: Phaser.GameObjects.Rectangle;
    private purchasableUnits!: Phaser.GameObjects.Group;
    private reloadGameStateButton!: GameButton;

    constructor() {
        super({ key: 'UI' });
    }

    preload() {
        this.load.image('button', 'assets/green_button00.png');
    }

    create() {
        this.purchasableUnits = this.add.group();
        this.startGameButton = new GameButton(this, 'Start Game', this.cameras.main.worldView.width - 200, this.cameras.main.worldView.height - 120, () => {
            client.send(new StartGame());
        });
        this.endTurnButton = new GameButton(this, 'End Turn', this.cameras.main.worldView.width - 200, this.cameras.main.worldView.height - 60, () => {
            client.send(new EndTurn());
        });
        this.reloadGameStateButton = new GameButton(this, 'Reload Game State', this.cameras.main.worldView.width - 200, this.cameras.main.worldView.height - 180, () => {
            client.send(new ReloadGameState());
        });

        this.text = this.add.text(10, 10, '', {
            font: '16px monospace',
            align: 'right',
            shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000',
                blur: 1,
                stroke: true,
                fill: true,
            },
        });

        this.scale.on('resize', this.resize, this);
    }

    resize(gameSize: any, baseSize: any, displaySize: any, resolution: any) {
        const width = baseSize.width;
        const height = baseSize.height;

        this.cameras.resize(width, height);

    }

    update(delta: number) {
        const information = []

        // Render debug info
        if (state.game) {
            information.push(`Current player: ${state.game.currentPlayer} ${ucFirst(state.game.players.find(player => player.name === state.game?.currentPlayer)?.color)}`)
            information.push(`Turn: ${state.game.turn}`)
            const unit = state.selectedUnit

            if (unit) {
                information.push(`Selected unit: ${state.selectedUnit?.type} ${state.selectedUnit?.x}x${state.selectedUnit?.y} MP:${(state.selectedUnit as MovableUnit)?.movementPoints}`)

            }

            for (const player of state.game.players) {
                information.push(`
                    ${player.name}
                    ${ucFirst(player.color)}
                    $${player.money}
                    Units: ${state.game?.units?.filter(unit => isMoveableUnit(unit) && unit.player === player.name)?.length}
                    Buildings: ${state.game?.units?.filter(unit => isBuilding(unit) && unit.player === player.name)?.length}
                `)
            }

            this.text.setText(information.join('\n'));
            this.text.setPosition(
                this.cameras.main.worldView.x + this.cameras.main.worldView.width - this.text.width - 10,
                this.cameras.main.worldView.y + 10,
            );
        }

        // Render UI
        this.startGameButton.update();
        this.endTurnButton.update();
        this.reloadGameStateButton.update();
    }

    public onProductionBuildingSelected(unit: Unit) {
        const building = unit as Building;
        const playerColor = state.game?.players.find(player => player.name === building.player)?.color || PlayerColor.NEUTRAL;
        const playerMoney = state.game?.players.find(player => player.name === building.player)?.money || 0;

        const height = building.canBuild.length * 32

        this.menuBackground = this.add.rectangle(
            (this.cameras.main.worldView.width / 2) - 100,
            (this.cameras.main.worldView.height / 2) - height/2,
            200,
            height,
            0xFCF3CF,
        ).setOrigin(0, 0);

        for (let index = 0; index < building.canBuild.length; index++) {
            const purchasableUnit = building.canBuild[index];

            const x = this.menuBackground.x + 8;
            const y = this.menuBackground.y + 8 + index * 32;

            const tempSprite = this.add.sprite(
                x,
                y,
                'tiles2',
                UnitSprites[playerColor][purchasableUnit]
            );
            tempSprite.setOrigin(0, 0);

            // @ts-ignore
            let cost: number = UnitTypeMap[purchasableUnit]?.cost;

            const unitNameText = this.add.text(
                x + 32,
                y,
                `${purchasableUnit}`,
                {
                    font: '16px monospace',
                    color: '#000',
                    align: 'left',
                }
            )
            unitNameText.setOrigin(0, 0);

            const unitCostText = this.add.text(
                x + 140,
                y,
                `$${cost}`,
                {
                    font: '16px monospace',
                    color: '#000',
                    align: 'right',
                }
            )

            if (cost > playerMoney) {
                tempSprite.setTint(0x808080);
                unitNameText.setTint(0x808080);
                unitCostText.setTint(0x808080);
            }

            this.purchasableUnits.add(tempSprite);
            this.purchasableUnits.add(unitNameText);
            this.purchasableUnits.add(unitCostText);
        }
    }

    public onProductionBuildingUnselected() {
        this.menuBackground.destroy(true);
        this.purchasableUnits.destroy(true);
        this.purchasableUnits = this.add.group();
    }

    public updateGameState() {
        if (this.startGameButton) {
            this.startGameButton.setVisible(!state.game?.started);
        }
        if (this.endTurnButton) {
            this.endTurnButton.setVisible(isOurTurn());
        }
    }
}