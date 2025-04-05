import themes from './themes';
import cursors from './cursors';
import PositionedCharacter from './PositionedCharacter';
import Magician from './Magician';
import Bowman from './Bowman';
import Vampire from './Vampire';
import Daemon from './Daemon';
import Swordsman from './Swordsman';
import Undead from './Undead';
import { generateTeam } from './generators';
import GamePlay from './GamePlay';
import GameState from './GameState';

export default class GameController {
  constructor( gamePlay, stateService ) {
    this.gamePlay               = gamePlay;
    this.stateService           = stateService;
    this.boardSize              = gamePlay.boardSize;
    this.gameState              = new GameState();
    this.userTypes              = [Bowman, Swordsman, Magician];
    this.computerTypes          = [Undead, Vampire, Daemon];
    this.activeCharacter        = null;
    this.levelThemes            = [themes.prairie, themes.desert, themes.arctic, themes.mountain];
    this.maxPositioningAttempts = 100; // Предотвращение бесконечного цикла
  }

  init() {
    // Установка всех обработчиков событий
    this.setupEventListeners();

    // Пытаемся загрузить сохраненную игру
    try {
      const savedGame = this.stateService.load();
      if ( savedGame ) {
        this.loadGame( savedGame );
        return;
      }
    }
    catch ( e ) {
      console.error( 'Failed to load saved game:', e );
    }

    // Если нет сохраненной игры, начинаем новую
    this.startNewGame();
  }

  setupEventListeners() {
    this.gamePlay.drawUi( this.levelThemes[ this.gameState.level - 1 ] );
    this.gamePlay.addCellClickListener( this.onCellClick.bind( this ) );
    this.gamePlay.addCellEnterListener( this.onCellEnter.bind( this ) );
    this.gamePlay.addCellLeaveListener( this.onCellLeave.bind( this ) );
    this.gamePlay.addNewGameListener( this.onNewGame.bind( this ) );
    this.gamePlay.addSaveGameListener( this.onSaveGame.bind( this ) );
    this.gamePlay.addLoadGameListener( this.onLoadGame.bind( this ) );
  }

  startNewGame() {
    this.gameState = new GameState();
    this.gamePlay.drawUi( this.levelThemes[ this.gameState.level - 1 ] );
    this.activeCharacter = null;

    const userTeam     = generateTeam( this.userTypes, this.gameState.level, 2 );
    const computerTeam = generateTeam( this.computerTypes, this.gameState.level, 2 );

    this.gameState.positions = [];

    // Размещаем команду игрока в левых двух колонках
    this.positionTeam( userTeam.members, 0, 1 );

    // Размещаем компьютерную команду в правых двух колонках
    this.positionTeam( computerTeam.members, this.boardSize - 2, this.boardSize - 1 );

    this.gameState.currentTurn = 'player';
    this.gamePlay.redrawPositions( this.gameState.positions );
  }

  positionTeam( members, minColumn, maxColumn ) {
    for ( const character of members ) {
      let position = null;
      let attempts = 0;

      while ( position === null && attempts < this.maxPositioningAttempts ) {
        attempts++;
        const column       = minColumn + Math.floor( Math.random() * ( maxColumn - minColumn + 1 ) );
        const row          = Math.floor( Math.random() * this.boardSize );
        const testPosition = row * this.boardSize + column;

        if ( ! this.gameState.positions.some( p => p.position === testPosition ) ) {
          position = testPosition;
        }
      }

      // Если не удалось найти позицию после максимального числа попыток,
      // выбираем случайную позицию из доступных
      if ( position === null ) {
        const allPositions       = new Set( Array.from( {length: this.boardSize * this.boardSize}, ( _, i ) => i ) );
        const occupiedPositions  = new Set( this.gameState.positions.map( p => p.position ) );
        const availablePositions = [...allPositions].filter( pos => {
          const col = pos % this.boardSize;
          return ! occupiedPositions.has( pos ) && col >= minColumn && col <= maxColumn;
        } );

        if ( availablePositions.length > 0 ) {
          position = availablePositions[ Math.floor( Math.random() * availablePositions.length ) ];
        }
        else {
          console.error( 'Unable to position character, no available positions' );
          continue; // Пропускаем этого персонажа
        }
      }

      this.gameState.positions.push( new PositionedCharacter( character, position ) );
    }
  }

  onCellClick( index ) {
    console.log( this.gameState.currentTurn );
    // Если сейчас не ход игрока, никакие действия не разрешены
    if ( this.gameState.currentTurn !== 'player' ) {
      return;
    }

    const clickedChar = this.gameState.positions.find( ( char ) => char.position === index );

    // Сценарий 1: Клик на персонажа игрока
    if ( clickedChar && this.isPlayerCharacter( clickedChar ) ) {
      this.selectPlayerCharacter( clickedChar );
      return;
    }

    // Сценарий 2: Клик на персонажа компьютера
    if ( clickedChar && ! this.isPlayerCharacter( clickedChar ) ) {
      this.handleComputerCharacterClick( clickedChar, index );
      return;
    }

    // Сценарий 3: Клик на пустую ячейку
    if ( ! clickedChar && this.activeCharacter ) {
      this.handleEmptyCellClick( index );
      return;
    }
  }

  selectPlayerCharacter( character ) {
    console.log( character );
    // Снимаем выделение с предыдущего активного персонажа
    if ( this.activeCharacter !== null ) {
      this.gamePlay.deselectCell( this.activeCharacter.position );
    }

    this.activeCharacter = character;
    this.gamePlay.selectCell( character.position );
  }

  handleComputerCharacterClick( character, index ) {
    // Если есть активный персонаж, проверяем возможность атаки
    if ( this.activeCharacter ) {
      if ( this.canAttack( this.activeCharacter.position, index ) ) {
        this.attack( this.activeCharacter, character );
        return;
      }
      else {
        GamePlay.showError( 'This character is out of attack range!' );
        return;
      }
    }
    else {
      GamePlay.showError( 'You cannot select opponent character!' );
      return;
    }
  }

  handleEmptyCellClick( index ) {
    // Проверяем возможность перемещения
    if ( this.canMove( this.activeCharacter.position, index ) ) {
      this.move( this.activeCharacter, index );
      return;
    }
    else {
      GamePlay.showError( 'This position is too far away!' );
      return;
    }
  }

  onCellEnter( index ) {
    const hoveredChar = this.gameState.positions.find( ( char ) => char.position === index );

    // Показываем подсказку для персонажа
    if ( hoveredChar ) {
      const {level, attack, defence, health} = hoveredChar.character;
      this.gamePlay.showCellTooltip( `🏅${level} ⚔${attack} 🛡${defence} ❤${health}`, index );
    }

    this.updateCursor( hoveredChar, index );
  }

  updateCursor( hoveredChar, index ) {
    // Меняем курсор в зависимости от содержимого ячейки и активного персонажа
    if ( this.activeCharacter ) {
      if ( hoveredChar ) {
        if ( this.isPlayerCharacter( hoveredChar ) ) {
          this.gamePlay.setCursor( cursors.pointer );
        }
        else if ( this.canAttack( this.activeCharacter.position, index ) ) {
          this.gamePlay.selectCell( index, 'red' );
          this.gamePlay.setCursor( cursors.crosshair );
        }
        else {
          this.gamePlay.setCursor( cursors.notallowed );
        }
      }
      else if ( this.canMove( this.activeCharacter.position, index ) ) {
        this.gamePlay.selectCell( index, 'green' );
        this.gamePlay.setCursor( cursors.pointer );
      }
      else {
        this.gamePlay.setCursor( cursors.notallowed );
      }
    }
    else if ( hoveredChar && this.isPlayerCharacter( hoveredChar ) ) {
      this.gamePlay.setCursor( cursors.pointer );
    }
    else {
      this.gamePlay.setCursor( cursors.auto );
    }
  }

  onCellLeave( index ) {
    this.gamePlay.hideCellTooltip( index );

    // Снимаем выделение, кроме активного персонажа
    if ( this.activeCharacter && index !== this.activeCharacter.position ) {
      this.gamePlay.deselectCell( index );
    }
  }

  onNewGame() {
    this.startNewGame();
  }

  onSaveGame() {
    try {
      this.stateService.save( this.gameState.save() );
      GamePlay.showMessage( 'Game saved successfully!' );
    }
    catch ( e ) {
      GamePlay.showError( 'Failed to save game!' );
      console.error( 'Error saving game:', e );
    }
  }

  onLoadGame() {
    try {
      const savedGame = this.stateService.load();
      if ( savedGame ) {
        this.loadGame( savedGame );
        GamePlay.showMessage( 'Game loaded successfully!' );
      }
      else {
        GamePlay.showError( 'No saved game found!' );
      }
    }
    catch ( e ) {
      GamePlay.showError( 'Failed to load game!' );
      console.error( 'Error loading game:', e );
    }
  }

  loadGame( savedState ) {
    try {
      // Проверяем структуру загруженных данных
      if ( ! this.isValidSaveState( savedState ) ) {
        throw new Error( 'Invalid save state format' );
      }

      this.gameState = GameState.from( savedState );
      this.gamePlay.drawUi( this.levelThemes[ this.gameState.level - 1 ] );
      this.activeCharacter = null;
      this.gamePlay.redrawPositions( this.gameState.positions );
    }
    catch ( e ) {
      GamePlay.showError( 'Failed to load game: corrupted save data' );
      console.error( e );
      // В случае ошибки начинаем новую игру
      this.startNewGame();
    }
  }

  isValidSaveState( state ) {
    // Базовая проверка структуры сохраненного состояния
    return state &&
      typeof state.level === 'number' &&
      typeof state.score === 'number' &&
      typeof state.maxScore === 'number' &&
      Array.isArray( state.positions ) &&
      ['player', 'computer', 'none'].includes( state.currentTurn );
  }

  isPlayerCharacter( character ) {
    return character.character.isUser === true;
  }

  getDistance( index1, index2 ) {
    const x1 = index1 % this.boardSize;
    const y1 = Math.floor( index1 / this.boardSize );
    const x2 = index2 % this.boardSize;
    const y2 = Math.floor( index2 / this.boardSize );

    return Math.max( Math.abs( x1 - x2 ), Math.abs( y1 - y2 ) );
  }

  getPositionsInRange( fromIndex, range ) {
    const result = [];
    const fromX  = fromIndex % this.boardSize;
    const fromY  = Math.floor( fromIndex / this.boardSize );

    // Проверяем все позиции на доске
    for ( let i = 0; i < this.boardSize * this.boardSize; i++ ) {
      const toX = i % this.boardSize;
      const toY = Math.floor( i / this.boardSize );

      const distance = Math.max( Math.abs( fromX - toX ), Math.abs( fromY - toY ) );

      if ( distance <= range ) {
        result.push( i );
      }
    }

    return result;
  }

  canMove( fromIndex, toIndex ) {
    const char = this.gameState.positions.find( c => c.position === fromIndex );
    if ( ! char ) return false;

    // Проверяем, пуста ли целевая ячейка
    if ( this.gameState.positions.some( c => c.position === toIndex ) ) {
      return false;
    }

    const distance = this.getDistance( fromIndex, toIndex );
    return distance <= char.character.walkRange;
  }

  canAttack( fromIndex, toIndex ) {
    const char = this.gameState.positions.find( c => c.position === fromIndex );
    if ( ! char ) return false;

    const distance = this.getDistance( fromIndex, toIndex );
    return distance <= char.character.attackRange;
  }

  move( character, newPosition ) {
    const oldPosition  = character.position;
    character.position = newPosition;

    this.gamePlay.deselectCell( oldPosition );
    this.gamePlay.deselectCell( newPosition );
    this.gamePlay.redrawPositions( this.gameState.positions );

    // Выбираем персонажа на новой позиции
    this.gamePlay.selectCell( newPosition );

    // Завершаем ход игрока
    this.endPlayerTurn();
  }

  attack( attacker, target, callback ) {
    const damage = Math.max(
      Math.round( attacker.character.attack - target.character.defence ),
      Math.round( attacker.character.attack * 0.1 )
    );

    this.gamePlay.showDamage( target.position, damage ).then( () => {
      // Применяем урон
      target.character.health -= damage;

      // Удаляем мертвого персонажа
      if ( target.character.health <= 0 ) {
        this.gameState.positions = this.gameState.positions.filter( c => c !== target );
        if ( ! this.isPlayerCharacter( target ) ) {
          this.gameState.score += target.character.level * 10;
        }
      }

      this.gamePlay.redrawPositions( this.gameState.positions );

      // Проверяем условия победы/поражения
      if ( this.checkWinLose() ) {
        return;
      }

      // Вызываем коллбэк для завершения хода (игрока или компа)
      if ( callback ) {
        callback();
      }
      else {
        this.endPlayerTurn(); // По умолчанию для игрока
      }
    } );
  }

  endPlayerTurn() {
    // Снимаем выделение с активного персонажа
    if ( this.activeCharacter ) {
      this.gamePlay.deselectCell( this.activeCharacter.position );
      this.activeCharacter = null;
    }

    this.gameState.currentTurn = 'computer';
    // Планируем ход ИИ
    setTimeout( () => {
      this.computerTurn();
    }, 500 );
  }

  computerTurn() {
    // Получаем всех персонажей компьютера и игрока
    const computerChars = this.gameState.positions.filter( c => ! this.isPlayerCharacter( c ) );
    const playerChars   = this.gameState.positions.filter( c => this.isPlayerCharacter( c ) );

    // Проверка на конец игры
    if ( computerChars.length === 0 || playerChars.length === 0 ) {
      this.checkWinLose();
      this.endComputerTurn();
      return;
    }

    // Пытаемся найти персонажа, который может атаковать
    const attackOptions = this.findBestAttackOption( computerChars, playerChars );

    if ( attackOptions ) {
      // Атакуем и передаём коллбэк для завершения хода компа
      this.attack( attackOptions.attacker, attackOptions.target, () => {
        this.endComputerTurn();
      } );
      return;
    }
    else {
      // Если атака невозможна, двигаемся к игроку
      this.moveComputerCharacter( computerChars, playerChars );
      this.endComputerTurn(); // Завершаем ход после движения
    }
  }

  endComputerTurn() {
    // Просто завершаем ход компьютера и возвращаем управление игроку
    this.gameState.currentTurn = 'player';
    this.gamePlay.redrawPositions( this.gameState.positions ); // Обновляем поле
  }

  findBestAttackOption( computerChars, playerChars ) {
    let bestAttacker = null;
    let bestTarget   = null;
    let maxDamage    = -1;

    for ( const computerChar of computerChars ) {
      for ( const playerChar of playerChars ) {
        if ( this.canAttack( computerChar.position, playerChar.position ) ) {
          // Рассчитываем потенциальный урон
          const damage = Math.max(
            computerChar.character.attack - playerChar.character.defence,
            computerChar.character.attack * 0.1
          );

          // Если этот удар может убить персонажа или наносит больше урона, чем предыдущие варианты
          if ( damage > playerChar.character.health || damage > maxDamage ) {
            bestAttacker = computerChar;
            bestTarget   = playerChar;
            maxDamage    = damage;

            // Если этот удар смертельный, выбираем его немедленно
            if ( damage > playerChar.character.health ) {
              break;
            }
          }
        }
      }
      if ( bestAttacker && maxDamage > bestTarget.character.health ) break;
    }

    if ( bestAttacker && bestTarget ) {
      return {attacker: bestAttacker, target: bestTarget};
    }

    return null;
  }

  moveComputerCharacter( computerChars, playerChars ) {
    // Выбираем случайного персонажа компьютера
    const computerChar = computerChars[ Math.floor( Math.random() * computerChars.length ) ];

    // Находим ближайшего персонажа игрока
    let closestPlayer = null;
    let minDistance   = Infinity;

    for ( const playerChar of playerChars ) {
      const distance = this.getDistance( computerChar.position, playerChar.position );
      if ( distance < minDistance ) {
        minDistance   = distance;
        closestPlayer = playerChar;
      }
    }

    if ( ! closestPlayer ) return;

    // Получаем все возможные позиции для перемещения
    const possibleMoves      = [];
    const walkRange          = computerChar.character.walkRange;
    const potentialPositions = this.getPositionsInRange( computerChar.position, walkRange );

    for ( const position of potentialPositions ) {
      // Проверяем, не занята ли позиция
      if ( ! this.gameState.positions.some( c => c.position === position ) && position !== computerChar.position ) {
        const distanceToPlayer = this.getDistance( position, closestPlayer.position );
        possibleMoves.push( {position, distance: distanceToPlayer} );
      }
    }

    if ( possibleMoves.length > 0 ) {
      // Сортируем по расстоянию до игрока (по возрастанию)
      possibleMoves.sort( ( a, b ) => a.distance - b.distance );
      const newPosition = possibleMoves[ 0 ].position;

      computerChar.position = newPosition;
      this.gamePlay.redrawPositions( this.gameState.positions );
    }
  }

  checkWinLose() {
    const playerChars   = this.gameState.positions.filter( c => this.isPlayerCharacter( c ) );
    const computerChars = this.gameState.positions.filter( c => ! this.isPlayerCharacter( c ) );

    // Проверяем поражение игрока
    if ( playerChars.length === 0 ) {
      this.gameOver();
      return true;
    }

    // Проверяем завершение уровня
    if ( computerChars.length === 0 ) {
      if ( this.gameState.level < 4 ) {
        this.levelUp();
      }
      else {
        this.gameWin();
      }
      return true;
    }

    return false;
  }

  levelUp() {
    // Обновляем максимальный счет
    if ( this.gameState.score > this.gameState.maxScore ) {
      this.gameState.maxScore = this.gameState.score;
    }

    // Повышаем уровень персонажей
    for ( const character of this.gameState.positions ) {
      if ( this.isPlayerCharacter( character ) ) {
        // Увеличиваем уровень
        character.character.level += 1;

        // Восстанавливаем здоровье на основе оставшегося здоровья
        const currentHealth        = character.character.health;
        character.character.health = Math.min(
          currentHealth + 80,
          100
        );

        // Увеличиваем атаку и защиту
        const lifeBonus             = ( 80 + currentHealth ) / 100;
        character.character.attack  = Math.max(
          character.character.attack,
          Math.floor( character.character.attack * lifeBonus )
        );
        character.character.defence = Math.max(
          character.character.defence,
          Math.floor( character.character.defence * lifeBonus )
        );
      }
    }

    // Увеличиваем уровень
    this.gameState.level += 1;

    // Добавляем новых врагов в зависимости от нового уровня
    const enemyCount = Math.min( this.gameState.level + 1, 4 );
    const newEnemies = generateTeam( this.computerTypes, this.gameState.level, enemyCount );

    // Размещаем новых врагов
    this.positionTeam( newEnemies.members, this.boardSize - 2, this.boardSize - 1 );

    // Меняем тему в зависимости от уровня
    this.gamePlay.drawUi( this.levelThemes[ this.gameState.level - 1 ] );
    this.gamePlay.redrawPositions( this.gameState.positions );

    GamePlay.showMessage( `Level ${this.gameState.level} started!` );

    // Сбрасываем ход на игрока
    this.gameState.currentTurn = 'player';
  }

  gameOver() {
    GamePlay.showMessage( `Game Over! Your score: ${this.gameState.score}` );

    // Обновляем максимальный счет
    if ( this.gameState.score > this.gameState.maxScore ) {
      this.gameState.maxScore = this.gameState.score;
    }

    // Отключаем игровое поле
    this.gameState.currentTurn = 'none';
  }

  gameWin() {
    GamePlay.showMessage( `Congratulations! You've completed the game! Your score: ${this.gameState.score}` );

    // Обновляем максимальный счет
    if ( this.gameState.score > this.gameState.maxScore ) {
      this.gameState.maxScore = this.gameState.score;
    }

    // Отключаем игровое поле
    this.gameState.currentTurn = 'none';
  }
}
