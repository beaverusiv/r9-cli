import { Command } from '@oclif/command';
import * as inquirer from 'inquirer';
import Gitlab from 'gitlab';
import { spawn } from 'child_process';
import { gte } from 'semver';
import { join } from 'path';
import { readFileSync } from 'fs';
import * as editJsonFile from 'edit-json-file';
import * as urlSlug from 'url-slug';

export default class CreateAdmin extends Command {
  static description = 'Create a new react-admin project, ' +
    'including the Gitlab project and stable/demo-integration branches';

  async asyncSpawn(
    command: string,
    args: string[],
    options: any = {},
    outputStderr: boolean = true,
    outputStdout: boolean = false,
    returnStdout: boolean = false,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const cmd = spawn(command, args, options);
      let output = '';

      if (outputStdout || returnStdout) {
        cmd.stdout.on('data', (data) => {
          if (returnStdout) {
            output += data;
          } else if (outputStdout) {
            console.log(`stdout: ${data}`);
          }
        });
      }

      if (outputStderr) {
        cmd.stderr.on('data', (data) => {
          console.log(`stderr: ${data}`);
        });
      }

      cmd.on('close', (code) => {
        console.log(`child process ${command} exited with code ${code}`);
        if (code === 0) {
          if (returnStdout) {
            resolve(output);
          } else {
            resolve(code);
          }
        } else {
          reject(code);
        }
      });
    });
  }

  async run() {
    let useTempCra: boolean = true;
    // config check
    let userConfig: any = readFileSync(join(this.config.configDir, 'config.json'));
    if (!userConfig) {
      this.log('Config file not found. Please run r9 config first to setup your Gitlab account');
    }
    userConfig = JSON.parse(userConfig);
    if (!userConfig) {
      this.log('Config not valid JSON. Please run r9 config first to setup your Gitlab account');
    }

    // version check
    const version: string = await this.asyncSpawn(
      'npx',
      ['create-react-app', '-V'],
      {},
      false,
      false,
      true,
    );
    if (version) {
      this.log('CRA version is ', version);
      if (gte(version, '2.1.0')) {
        this.log('Using local CRA package');
        useTempCra = false;
      } else {
        this.log('Local CRA not 2.1.0 or newer, using temporary package');
      }
    } else {
      this.log('CRA not found, using temporary package');
    }

    const api = new Gitlab({
      url: userConfig.gitlab_url,
      token: userConfig.gitlab_key,
    });

    // get groups for selection list
    const groups = await api.Groups.all();
    const groupOptions = groups.map((group: any) => ({
      name: group.name,
      value: { id: group.id, path: group.path },
    }));
    groupOptions.push({ name: 'Create new group', value: 'create_new' });

    // ask the questions
    const data: any = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'group',
          message: 'Select a group: ',
          choices: groupOptions,
        },
        {
          name: 'create_group_name',
          message: 'Name of the new group: ',
          when: (answers: any) => answers.group === 'create_new',
        },
        {
          name: 'create_group_path',
          message: 'Path of the new group: ',
          default: (answers: any) => urlSlug(answers.create_group_name),
          when: (answers: any) => answers.group === 'create_new',
        },
        {
          name: 'project',
          message: 'Name of the project: ',
        },
        {
          name: 'project_path',
          message: 'Path of the project: ',
          default: (answers: any) => urlSlug(answers.project),
        },
      ]);

    // create gitlab group
    if (data.create_group_name) {
      await api.Groups.create({
        name: data.create_group_name,
        path: data.create_group_path,
        visibility: 'internal',
      });
    }

    // create gitlab project
    await api.Projects.create({
      name: data.project,
      path: data.project_path,
      namespace_id: data.group.id,
      visibility: 'internal',
      default_branch: 'stable',
    });
    // create the local project
    const craArgs = ['create-react-app', data.project, '--typescript'];
    if (useTempCra) {
      craArgs.unshift('--package');
    }
    await this.asyncSpawn(
      'npx',
      craArgs,
      { cwd: userConfig.projects_path },
    );
    await this.asyncSpawn(
      'npm',
      ['install', '--save', 'react-admin', '@feathersjs/client', '@room9/ra-feathers-client'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'npm',
      [
        'install',
        '--save-dev',
        'ra-data-fakerest',
        '@types/node',
        '@feathersjs/feathers',
        '@types/feathersjs__feathers',
        '@types/react',
      ],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    const filesToCopy: any = {
      src: [
        'App.tsx',
        'mapRequests.test.ts',
        'mapRequests.ts',
        'providers.ts',
        'types',
      ],
      '__mocks__/@room9': [
        'ra-feathers-client.js',
      ],
    };
    const pathToFiles = join(__dirname, '../assets/create-admin');
    const copyPromises: Promise<any>[] = [];
    Object.keys(filesToCopy).forEach(async (dir: string) => {
      const pathsToCopy = filesToCopy[dir].map((file: string) => `${pathToFiles}/${dir}/${file}`);
      if (dir.includes('/')) {
        await this.asyncSpawn(
          'mkdir',
          ['-p', `${userConfig.projects_path}/${data.project}/${dir}/`],
        );
      }
      copyPromises.push(this.asyncSpawn(
        'cp',
        ['-r', ...pathsToCopy, `${userConfig.projects_path}/${data.project}/${dir}/`],
      ));
    });
    await Promise.all(copyPromises);
    const tsconfigFile = editJsonFile(`${userConfig.projects_path}/${data.project}/tsconfig.json`);
    const libs = tsconfigFile.get('compilerOptions.lib') || [];
    ['dom', 'es2015', 'es2017'].forEach((lib) => {
      if (!libs.includes(lib)) {
        libs.push(lib);
      }
    });
    tsconfigFile.set('compilerOptions.lib', libs);
    tsconfigFile.save();
    await this.asyncSpawn(
      'git',
      ['remote', 'add', 'origin', `git@git.room9.co.nz:${data.group.path}/${data.project}.git`],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'git',
      ['add', '-A'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'git',
      ['commit', '--amend', '-am', '"Initial commit"'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'git',
      ['branch', '-m', 'stable'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'git',
      ['tag', 'v0.1.0'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'git',
      ['push', '-u', 'origin', '--all'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'git',
      ['push', '-u', 'origin', '--tags'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
    await this.asyncSpawn(
      'twgit',
      ['demo', 'start', 'integration'],
      { cwd: `${userConfig.projects_path}/${data.project}` },
    );
  }
}
