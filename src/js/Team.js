export default class Team {
  constructor() {
    this.members = new Set();
  }

  add( character ) {
    if ( this.members.has( character ) ) {
      throw new Error( 'Character already exists in the team' );
    }
    this.members.add( character );
  }

  addAll( ...characters ) {
    characters.forEach( character => {
      this.add( character );
    } );
  }

  toArray() {
    return Array.from( this.members );
  }


  // Решение с использованием итератора
  /*[ Symbol.iterator ]() {
    const members = Array.from( this.members );
    let index     = 0;

    return {
      next() {
        if ( index < members.length ) {
          return {
            done: false,
            value: members[ index++ ]
          };
        }
        return {done: true};
      }
    };
  }*/

  // Реализация с использованием генератора
  * [ Symbol.iterator ]() {
    // Просто используем yield для каждого персонажа
    for ( const member of this.members ) {
      yield member;
    }
  }
}
