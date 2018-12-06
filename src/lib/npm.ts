import { runCmd } from './shell';

export function npmInstall(packages: string[]) {
  return runCmd('npm', ['install', '--save', ...packages]);
}

export function npmInstallDev(packages: string[]) {
  return runCmd('npm', ['install', '--save-dev', ...packages]);
}
