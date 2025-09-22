import { HELP_TEXT } from '../constants';
import { info } from '../lib/report.ts';

export default function help() {
  return () => {
    info(HELP_TEXT);
  };
}
