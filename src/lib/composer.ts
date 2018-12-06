import { runCmd } from './shell';

const composerCmd =
  'docker run --rm -v $PWD:/var/www/html -v ~/.composer_cache:/tmp/composer/cache --user $(id -u):$(id -g) -e COMPOSER_HOME=/tmp/composer docker.room9.co.nz:5000/room9/php:7.2-silverstripe-test composer';

export function composerCreateProject(
  projectName: string,
  projectType: string,
) {
  runCmd(
    `${composerCmd} --remove-vcs create-project ${projectType} /var/www/html/${projectName} ^4`,
  );
}

export function composerInstallDev(pkg: string, version: string) {
  runCmd(
    `${composerCmd} require --dev --ignore-platform-reqs --working-dir /var/www/html ${pkg} ${version}`,
  );
}
