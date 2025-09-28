import { HELP_TEXT } from '../help-text.ts';
import { info } from '@skyreach/cli-kit';

export default function help() {
  return () => {
    info(HELP_TEXT);
  };
}
