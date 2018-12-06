import { runCmd } from './shell';
import { join } from 'path';

export async function composerCreateProject(
  projectName: string,
  projectType: string,
  projectDir: string,
) {
  const composerCmd = 'docker';
  const composerArgs = [
    'run',
    '--rm',
    '-v',
    `${projectDir}:/var/www/html`,
    '-v',
    join(process.env.HOME || '', '.composer_cache:/tmp/composer/cache'),
    '--user',
    '1000:1000',
    '-e',
    'COMPOSER_HOME=/tmp/composer',
    'docker.room9.co.nz:5000/room9/php:7.2-silverstripe-test',
    'composer',
  ];
  return runCmd(composerCmd, [
    ...composerArgs,
    '--remove-vcs',
    'create-project',
    projectType,
    `/var/www/html/${projectName}`,
    '^4',
  ]);
}

export function composerInstallDev(
  pkg: string,
  version: string,
  projectDir: string,
) {
  const composerCmd = 'docker';
  const composerArgs = [
    'run',
    '--rm',
    '-v',
    `${projectDir}:/var/www/html`,
    '-v',
    join(process.env.HOME || '', '.composer_cache:/tmp/composer/cache'),
    '--user',
    '1000:1000',
    '-e',
    'COMPOSER_HOME=/tmp/composer',
    'docker.room9.co.nz:5000/room9/php:7.2-silverstripe-test',
    'composer',
  ];
  return runCmd(composerCmd, [
    ...composerArgs,
    'require',
    '--dev',
    '--ignore-platform-reqs',
    '--working-dir',
    '/var/www/html',
    pkg,
    version,
  ]);
}
