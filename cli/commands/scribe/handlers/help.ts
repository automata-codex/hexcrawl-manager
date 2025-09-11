import { HELP_TEXT } from '../constants';
import { info } from '../report.ts';

export default function help() {
  return () => { info(HELP_TEXT); };
}
