import * as shell from 'shelljs';
import * as ora from 'ora';
import { Verbosity } from '../types/verbosity.enum';

export function checkBinaryDependencies(binaries: string[], verbosity: Verbosity): boolean {
  let passedChecks: boolean = true;
  if (verbosity > Verbosity.Normal) {
    shell.echo('Checking binary dependencies:');
  }
  binaries.forEach((binary: string) => {
    let spinner;
    if (verbosity > Verbosity.Normal) {
      spinner = ora(`Checking ${binary}`).start();
    }
    if (!shell.which(binary)) {
      if (verbosity > Verbosity.Normal && spinner) {
        spinner.fail(`${binary} not found`);
      } else {
        shell.echo(`Binary dependency ${binary} not found`);
      }
      passedChecks = false;
    } else {
      if (verbosity > Verbosity.Normal && spinner) {
        spinner.succeed(`${binary} found`);
      }
    }
  });
  return passedChecks;
}
