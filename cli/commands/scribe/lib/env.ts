export function detectDevMode(args: string[]): boolean {
  return process.env.SKYREACH_DEV === 'true' || args.includes('--dev');
}
