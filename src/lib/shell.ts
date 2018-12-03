import * as shell from 'shelljs';

/*
 * wrap exec() so we can throw errors
 */
export function runCmd(cmd: string): void {
  const result: shell.ExecOutputReturnValue = shell.exec(cmd, {
    silent: true,
  }) as shell.ExecOutputReturnValue;
  if (result.code !== 0) {
    throw new Error(result.stderr);
  }
}
