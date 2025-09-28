import { HELP_TEXT } from '../help-text.ts';
import { info } from '../lib/report.ts';

export default function help() {
  return () => {
    info(HELP_TEXT);
  };
}
