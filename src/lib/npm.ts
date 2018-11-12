import * as shell from 'shelljs';

export function npmInstall(packages: string[]) {
  return shell.exec(`npm install --save ${packages.join(' ')}`);
}

export function npmInstallDev(packages: string[]) {
  return shell.exec(`npm install --save-dev ${packages.join(' ')}`);
}
