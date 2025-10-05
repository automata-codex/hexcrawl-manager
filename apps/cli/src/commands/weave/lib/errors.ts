export class CliError extends Error { code = 1 }

export class DirtyGitError extends CliError { code = 1 }
