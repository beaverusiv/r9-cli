import { runCmd } from './shell';

export function npmInstall(packages: string[]) {
  return runCmd(`npm install --save ${packages.join(' ')}`);
}

export function npmInstallDev(packages: string[]) {
  return runCmd(`npm install --save-dev ${packages.join(' ')}`);
}
