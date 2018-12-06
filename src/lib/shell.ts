import { spawn } from 'child_process';

export async function runCmd(
  cmd: string,
  args: string[] = [],
  wd: string = '',
): Promise<any> {
  return new Promise((resolve, reject) => {
    const process = spawn(cmd, args, { cwd: wd, stdio: 'pipe' });
    let output = '';
    process.stdout.on('data', (chunk) => (output += chunk));
    process.stderr.on('data', (chunk) => (output += chunk));
    process.on('error', (err) => {
      reject(
        new Error(
          `${cmd} returned an error:\n${JSON.stringify(err)}\n\n${output}`,
        ),
      );
    });
    process.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`${cmd} returned code ${code}\n${output}`));
      } else {
        resolve();
      }
    });
  });
}
