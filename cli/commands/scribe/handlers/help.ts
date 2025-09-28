import { info } from '@skyreach/cli-kit';

import { HELP_TEXT } from '../help-text.ts';

export default function help() {
  return () => {
    info(HELP_TEXT);
  };
}
