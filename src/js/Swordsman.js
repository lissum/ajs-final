import Character from './Character';

export default class Swordsman extends Character {
  constructor( level ) {
    super( level, 'swordsman' );

    this.attack      = 40;
    this.defence     = 10;
    this.walkRange   = 4;
    this.attackRange = 4;
    this.isUser      = true;
  }
}
