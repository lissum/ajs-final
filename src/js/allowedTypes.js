import Bowman from './Bowman';
import Swordsman from './Swordsman';
import Daemon from './Daemon';
import Undead from './Undead';
import Magician from './Magician';
import Vampire from './Vampire';

const computerTypes = [
  Daemon,
  Undead,
  Vampire,
];

const userTypes = [
  Swordsman,
  Bowman,
  Magician,
];

export { computerTypes, userTypes };
