import { info } from '@achm/cli-kit';

import { HELP_TEXT } from '../help-text';

export default function help() {
  return () => {
    info(HELP_TEXT);
  };
}
