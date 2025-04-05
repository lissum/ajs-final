export default class GameState {
  constructor() {
    this.level       = 1;
    this.score       = 0;
    this.currentTurn = 'player'; // 'player' or 'computer'
    this.positions   = [];
    this.theme       = 'prairie';
    this.maxScore    = 0;
  }

  static from( object ) {
    if ( typeof object !== 'object' ) {
      return null;
    }

    const gameState = new GameState();

    if ( object.level ) gameState.level = object.level;
    if ( object.score ) gameState.score = object.score;
    if ( object.currentTurn ) gameState.currentTurn = object.currentTurn;
    if ( object.positions ) gameState.positions = object.positions;
    if ( object.theme ) gameState.theme = object.theme;
    if ( object.maxScore ) gameState.maxScore = object.maxScore;

    return gameState;
  }

  save() {
    return {
      level: this.level,
      score: this.score,
      currentTurn: this.currentTurn,
      positions: this.positions,
      theme: this.theme,
      maxScore: this.maxScore,
    };
  }
}
