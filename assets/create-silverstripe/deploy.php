<?php

namespace Deployer;

$home = getenv("HOME");

require $home . '/.composer/vendor/deployer/recipes/rsync.php';
require 'recipe/silverstripe.php';

// Set configurations
set('ssh_type', 'native');
set('ssh_multiplexing', true);
set('repository', 'git@git.room9.co.nz:GROUP_NAME/PROJECT_NAME.git');
set('shared_dirs', [
    'public/assets'
]);

set('writable_dirs', ['public/assets', 'silverstripe-cache']);
set('default_stage', 'dev');
set('http_user', 'www-data');
set('http_group', 'www-data');
set('keep_releases', 1);
set('writable_use_sudo', true);
set('writable_mode', 'chown');
set('clear_use_sudo', true);
set('cleanup_use_sudo', true);

// Servers
serverList('servers.yml');

set('rsync_src', __DIR__);
set('rsync_dest', '{{release_path}}');

set('rsync', [
    'exclude' => [
        'silverstripe-cache',
        'gulpfile.js',
        'ci',
        'composer.*',
        '.gitignore',
        '.gitlab-ci.yml',
        '.editorconfig',
        'package.json',
        'README.md',
        'phpcs.xml.dist',
        'phpunit.xml.dist',
        'servers.yml',
        'servers.sample.yml',
        'web.config',
        '.git',
        'deploy.php',
    ],
    'exclude-file' => false,
    'include' => [],
    'include-file' => false,
    'filter' => [],
    'filter-file' => false,
    'filter-perdir' => false,
    'flags' => 'lrz', // Recursive, with compress
    'options' => ['delete'],
    'timeout' => 1000,
]);

task('silverstripe:create-cache-dir', function () {
    return run('mkdir -p {{release_path}}/silverstripe-cache');
})->desc('Create cache directory');

task('silverstripe:release-build-flush', function () {
    return run('export APACHE_RUN_USER={{http_user}} && {{bin/php}} {{release_path}}/{{silverstripe_cli_script}} /dev/build flush=1');
})->desc('Run /dev/build');

task('silverstripe:migrate', function () {
    return run('export APACHE_RUN_USER={{http_user}} && {{bin/php}} {{release_path}}/{{silverstripe_cli_script}} /dev/tasks/MigrateTask');
})->desc('Run /dev/tasks/MigrateTask');

task('silverstripe:cache-owner', function () {
    return run('sudo chown -R {{http_user}}:{{http_user}} {{release_path}}/silverstripe-cache');
})
    ->onlyOn(['hub-dev'])
    ->desc('Cache dir owner to http_user');

task('silverstripe:assets-owner', function () {
    return run('sudo chown -R {{http_user}}:{{http_user}} {{release_path}}/public/assets/');
})
    ->onlyOn(['hub-dev'])
    ->desc('Assets dir owner to http_user');

/**
 * Main task
 */
task('deploy', [
    'deploy:prepare',
    'deploy:lock',
    'deploy:release',
    'rsync',
    'deploy:shared',
    // SILVERSTRIPE BEGIN
    'silverstripe:create-cache-dir',
    'silverstripe:release-build-flush',
    'silverstripe:migrate',
    'silverstripe:cache-owner',
    'silverstripe:assets-owner',
    // SILVERSTRIPE END
    'deploy:writable',
    'deploy:symlink',
    'deploy:unlock',
    'cleanup',
])->desc('Deploy your project');

after('deploy', 'success');

