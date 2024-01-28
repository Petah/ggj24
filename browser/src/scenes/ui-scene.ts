import { client } from '../client';
import { GameButton } from '../button';
import { PlayerColor, Unit, UnitType, UnitTypeMap } from '../../../common/unit';
import { isOurTurn, state } from '../state';
import { Building, MovableUnit, isBuilding, isMoveableUnit } from '../../../common/unit';
import { CaptureRequest, EndTurn, ReloadGameState, StartGame } from '../../../common/events/turn';
import { ucFirst } from '../../../common/util';
import { Dialog } from '../dialog';
import { formatNumber } from '../../../common/util';
import { UnitSprites } from '../unit-sprites';

const textConfig = {
    font: '16px',
    align: 'left',
    shadow: {
        offsetX: 1,
        offsetY: 1,
        color: '#000',
        blur: 1,
        stroke: true,
        fill: true,
    },
};

const unitInfo = {
    [UnitType.TANK]: [
        'Strong all round unit',
        'Small range',
    ],
    [UnitType.INFANTRY]: [
        'Can capture buildings',
    ],
    [UnitType.ANTI_TANK]: [
        'Can capture buildings',
        'Strong against tanks',
    ],
    [UnitType.ROCKET_TRUCK]: [
        'Long range',
        'Can\'t move and fire',
        'Can\'t shoot air',
    ],
    [UnitType.JET]: [
        'Can fly over sea',
        'Fast',
    ],
    [UnitType.HELICOPTER]: [
        'Can fly over sea',
    ],
}

export class UI extends Phaser.Scene {

    private text!: Phaser.GameObjects.Text;
    // private money!: Phaser.GameObjects.Text;

    private startGameButton!: GameButton;
    private endTurnButton!: GameButton;
    private menuBackground!: Phaser.GameObjects.Rectangle;
    private purchasableUnits!: Phaser.GameObjects.Group;
    private purchaseCursor!: Phaser.GameObjects.Sprite;
    private reloadGameStateButton!: GameButton;
    private captureButton!: GameButton;
    private purchasableUnitList!: UnitType[];
    private selectedPurchaseListIndex = 0;
    private windowRed!: Dialog;
    private windowBlue!: Dialog;
    private avatarRed!: Phaser.GameObjects.Sprite;
    private avatarBlue!: Phaser.GameObjects.Sprite;
    private selectedUnitSprite!: Phaser.GameObjects.Sprite;
    private selectedUnitName!: Phaser.GameObjects.Text;
    private selectedUnitInfo!: Phaser.GameObjects.Text;

    constructor() {
        super({ key: 'UI' });
    }

    preload() {
        this.load.image('buttonGreen', 'assets/button-green.png');
        this.load.image('dialog', 'assets/dialog.png');
        this.load.image('avatarRed', 'assets/avatar-red.png');
        this.load.image('avatarBlue', 'assets/avatar-blue.png');
        this.load.image('avatarGreen', 'assets/avatar-green.png');
        this.load.image('windowRed', 'assets/window-red.png');
        this.load.image('windowBlue', 'assets/window-blue.png');
        this.load.script('webfont', '//ajax.googleapis.com/ajax/libs/webfont/1.4.7/webfont.js');
    }

    create() {
        const screenWidth = this.cameras.main.worldView.width;
        const screenHeight = this.cameras.main.worldView.height;

        const sidebar = new Dialog(this, 'dialog', screenWidth - 300, 0, 300, screenHeight);
        this.windowRed = new Dialog(this, 'windowRed', screenWidth - 280, 20, 260, 260);
        this.windowBlue = new Dialog(this, 'windowBlue', screenWidth - 280, 20, 260, 260).setVisible(false);
        this.avatarRed = this.add.sprite(screenWidth - 225, 40, 'avatarRed').setScale(1.5).setOrigin(0, 0);
        this.avatarBlue = this.add.sprite(screenWidth - 225, 40, 'avatarBlue').setScale(1.5).setOrigin(0, 0).setVisible(false);

        this.selectedUnitSprite = this.add.sprite(screenWidth - 100, 450, 'tiles2', UnitSprites[PlayerColor.RED][UnitType.TANK]).setScale(4).setOrigin(0).setVisible(false);
        this.selectedUnitName = this.add.text(screenWidth - 280, 480, 'Tank', {
            ...textConfig,
            font: '32px',
        }).setVisible(false);
        this.selectedUnitInfo = this.add.text(screenWidth - 280, 520, 'Strong all round unit', {
            ...textConfig,
            font: '16px',
        }).setVisible(false);

        this.purchasableUnits = this.add.group();
        this.startGameButton = new GameButton(this, 'Start Game', screenWidth - 280, screenHeight - 70, () => {
            client.send(new StartGame());
        });
        this.endTurnButton = new GameButton(this, 'End Turn', screenWidth - 280, screenHeight - 70, () => {
            client.send(new EndTurn());
        });
        // this.reloadGameStateButton = new GameButton(this, 'Reload Game State', screenWidth - 400, screenHeight - 180, () => {
        //     client.send(new ReloadGameState());
        // });
        this.captureButton = new GameButton(this, 'Capture', screenWidth - 280, screenHeight - 130, () => {
            if (state.selectedUnit) {
                client.send(new CaptureRequest(state.selectedUnit.id, state.selectedUnit.x, state.selectedUnit.y));
            }
        });
        this.captureButton.setEnabled(false);

        this.text = this.add.text(screenWidth - 280, 300, '', {
            ...textConfig,
            font: '32px',
        });
        // this.money = this.add.text(0, 0, '', {
        //     ...textConfig,
        //     font: '32px',
        // });

        this.scale.on('resize', this.resize, this);

        this.updateGameState();
    }

    resize(gameSize: any, baseSize: any, displaySize: any, resolution: any) {
        const width = baseSize.width;
        const height = baseSize.height;

        this.cameras.resize(width, height);

    }

    update() {
        if (!state.game) {
            return;
        }
        const currentPlayer = state.game.players.find(player => player.name === state.game?.currentPlayer);
        if (!currentPlayer) {
            return;
        }
        // this.money.setText(`$ ${formatNumber(currentPlayer?.money)}`);
        // this.positionInSidebar(this.money, 20, 20);

        const information: string[] = [];
        const selectedUnitInfo: string[] = [];

        // Render debug info
        if (state.game) {
            const money = currentPlayer.money.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            information.push(`${currentPlayer.name}`)
            information.push(`$ ${money}`)
            information.push(`Units: ${state.game?.units?.filter(unit => isMoveableUnit(unit) && unit.player === currentPlayer.name)?.length}`)
            information.push(`Buildings: ${state.game?.units?.filter(unit => isBuilding(unit) && unit.player === currentPlayer.name)?.length}`)


            this.text.setText(information.join('\n'));

            if (state.selectedUnit) {
                if (unitInfo[state.selectedUnit.type]) {
                    selectedUnitInfo.push(...unitInfo[state.selectedUnit.type]);
                }
                this.selectedUnitSprite.setFrame(UnitSprites[currentPlayer.color][state.selectedUnit.type]).setVisible(true);
                this.selectedUnitName.setText(state.selectedUnit.type).setVisible(true);
                this.selectedUnitInfo.setText(selectedUnitInfo.join('\n')).setVisible(true);
            } else {
                this.selectedUnitSprite.setVisible(false);
                this.selectedUnitName.setVisible(false);
                this.selectedUnitInfo.setVisible(false);
            }
        }

        // Render UI
        this.startGameButton.update();
        this.endTurnButton.update();
        // this.reloadGameStateButton.update();
        this.captureButton.update();
    }

    private positionInSidebar(gameObject: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text, x: number, y: number) {
        gameObject.setPosition(
            this.cameras.main.worldView.x + this.cameras.main.worldView.width - 300 + x,
            this.cameras.main.worldView.y + y,
        );
    }

    public onProductionBuildingSelected(unit: Unit) {
        const building = unit as Building;
        const playerColor = state.game?.players.find(player => player.name === building.player)?.color || PlayerColor.NEUTRAL;
        const playerMoney = state.game?.players.find(player => player.name === building.player)?.money || 0;
        this.purchasableUnitList = building.canBuild;
        this.selectedPurchaseListIndex = 0;

        const height = building.canBuild.length * 32

        this.menuBackground = this.add.rectangle(
            (this.cameras.main.worldView.width / 2) - 100,
            (this.cameras.main.worldView.height / 2) - height / 2,
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
            const cost: number = UnitTypeMap[purchasableUnit]?.cost;

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

        this.purchaseCursor = this.add.sprite(
            this.menuBackground.x,
            this.menuBackground.y,
            'bigCursor',
            0
        ).setOrigin(0, 0);
    }

    public onProductionBuildingUnselected() {
        this.menuBackground.destroy(true);
        this.purchasableUnits.destroy(true);
        this.purchasableUnits = this.add.group();
        this.purchaseCursor.destroy(true);
    }

    public movePurchaseCursorUp() {
        if (this.selectedPurchaseListIndex === 0) return;

        this.selectedPurchaseListIndex--;
        this.purchaseCursor.setPosition(
            this.purchaseCursor.x,
            this.purchaseCursor.y - 32,
        )
    }

    public movePurchaseCursorDown() {
        if (this.selectedPurchaseListIndex === this.purchasableUnitList.length - 1) return;

        this.selectedPurchaseListIndex++;
        this.purchaseCursor.setPosition(
            this.purchaseCursor.x,
            this.purchaseCursor.y + 32,
        )
    }

    public getSelectedUnitTypeFromPurchaseList() {
        return this.purchasableUnitList[this.selectedPurchaseListIndex];
    }

    public updateGameState() {
        this.startGameButton?.setVisible(!state.game?.started);
        this.endTurnButton?.setEnabled(isOurTurn()).setVisible(!!state.game?.started);
        this.captureButton?.setVisible(!!state.game?.started);
        const currentPlayer = state.game?.players.find(player => player.name === state.game?.currentPlayer);
        if (currentPlayer) {
            this.windowRed?.setVisible(currentPlayer.color === PlayerColor.RED);
            this.windowBlue?.setVisible(currentPlayer.color === PlayerColor.BLUE);
            this.avatarRed?.setVisible(currentPlayer.color === PlayerColor.RED);
            this.avatarBlue?.setVisible(currentPlayer.color === PlayerColor.BLUE);
        }
    }

    public submitCapture() {
        if (state.selectedUnit) {
            client.send(new CaptureRequest(state.selectedUnit.id, state.selectedUnit.x, state.selectedUnit.y));
        }
    }

    public enableCaptureButton() {
        if (this.captureButton) {
            this.captureButton.setEnabled(true);
        }
    }

    public disableCaptureButton() {
        if (this.captureButton) {
            this.captureButton.setEnabled(false);
        }
    }
}