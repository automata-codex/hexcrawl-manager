import { HELP_TEXT } from '../constants';

export default function help() {
  return () => { console.log(HELP_TEXT); };
}
