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

  async checkVersion() {
    let useTempCra: boolean = true;
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
    return useTempCra;
  }

  async loadConfig() {
    let userConfig: any = readFileSync(join(this.config.configDir, 'config.json'));
    if (!userConfig) {
      this.log('Config file not found. Please run r9 config first to setup your Gitlab account');
    }
    userConfig = JSON.parse(userConfig);
    if (!userConfig) {
      this.log('Config not valid JSON. Please run r9 config first to setup your Gitlab account');
    }
    return userConfig;
  }

  async getGroupList(api: any): Promise<any[]> {
    const groups = await api.Groups.all();
    const groupOptions = groups.map((group: any) => ({
      name: group.name,
      value: { id: group.id, path: group.path },
    }));
    groupOptions.push({ name: 'Create new group', value: 'create_new' });
    return groupOptions;
  }

  async getAnswers(groupOptions: any[]) {
    return inquirer
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
        {
          name: 'variables.dev_api_url',
          message: 'Development API URL: ',
          default: (answers: any) => `https://${answers.project_path}-api.dev.room9.nz`,
        },
        {
          name: 'variables.uat_api_url',
          message: 'UAT API URL: ',
          default: (answers: any) => answers.variables.dev_api_url.replace('.dev.', '.uat.'),
        },
        {
          name: 'variables.prod_api_url',
          message: 'Production API URL: ',
          default: (answers: any) => answers.variables.dev_api_url.replace('.dev.', '.prod.'),
        },
        {
          name: 'variables.dev_url',
          message: 'Development Admin URL: ',
          default: (answers: any) => answers.variables.dev_api_url.replace('-api.', '.'),
        },
        {
          name: 'variables.uat_url',
          message: 'UAT Admin URL: ',
          default: (answers: any) => answers.variables.dev_url.replace('.dev.', '.uat.'),
        },
        {
          name: 'variables.prod_url',
          message: 'Production Admin URL: ',
          default: (answers: any) => answers.variables.dev_url.replace('.dev.', '.prod.'),
        },
      ]);
  }

  async installCra(userConfig: any, data: any, useTempCra: boolean) {
    const craArgs = ['create-react-app', data.project, '--typescript'];
    if (useTempCra) {
      craArgs.unshift('--package');
    }
    await this.asyncSpawn(
      'npx',
      craArgs,
      { cwd: userConfig.projects_path },
    );
  }

  async installReactAdmin(projectDirectory: string) {
    await this.asyncSpawn(
      'npm',
      ['install', '--save', 'react-admin', '@feathersjs/client', '@room9/ra-feathers-client'],
      { cwd: projectDirectory },
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
      { cwd: projectDirectory },
    );
  }

  async copyFiles(projectDirectory: string) {
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
      '.': [
        '.gitlab-ci.yml',
      ],
    };
    const pathToFiles = join(__dirname, '../assets/create-admin');
    const copyPromises: Promise<any>[] = [];
    Object.keys(filesToCopy).forEach(async (dir: string) => {
      const pathsToCopy = filesToCopy[dir].map((file: string) => `${pathToFiles}/${dir}/${file}`);
      if (dir.includes('/')) {
        await this.asyncSpawn(
          'mkdir',
          ['-p', `${projectDirectory}/${dir}/`],
        );
      }
      copyPromises.push(this.asyncSpawn(
        'cp',
        ['-r', ...pathsToCopy, `${projectDirectory}/${dir}/`],
      ));
    });
    return Promise.all(copyPromises);
  }

  editTsconfig(projectDirectory: string) {
    const tsconfigFile = editJsonFile(`${projectDirectory}/tsconfig.json`);
    const libs = tsconfigFile.get('compilerOptions.lib') || [];
    ['dom', 'es2015', 'es2017'].forEach((lib) => {
      if (!libs.includes(lib)) {
        libs.push(lib);
      }
    });
    tsconfigFile.set('compilerOptions.lib', libs);
    tsconfigFile.save();
  }

  async setupGit(projectDirectory: string, group: string, project: string) {
    await this.asyncSpawn(
      'git',
      ['remote', 'add', 'origin', `git@git.room9.co.nz:${group}/${project}.git`],
      { cwd: projectDirectory },
    );
    await this.asyncSpawn('git', ['add', '-A'], { cwd: projectDirectory });
    await this.asyncSpawn(
      'git',
      ['commit', '--amend', '-am', '"Initial commit"'],
      { cwd: projectDirectory },
    );
    await this.asyncSpawn('git', ['branch', '-m', 'stable'], { cwd: projectDirectory });
    await this.asyncSpawn('git', ['tag', 'v0.1.0'], { cwd: projectDirectory });
    await this.asyncSpawn('git', ['push', '-u', 'origin', '--all'], { cwd: projectDirectory });
    await this.asyncSpawn('git', ['push', '-u', 'origin', '--tags'], { cwd: projectDirectory });
    await this.asyncSpawn('twgit', ['demo', 'start', 'integration'], { cwd: projectDirectory });
  }

  async setupGitlabVariables(variables: any, api: any, projectId: number) {
    const variablePromises: Promise<any>[] = [];
    Object.keys(variables).forEach((i: string) => {
      this.log('var', i, variables[i]);
      return api.ProjectVariables.create(
        projectId,
        '',
        {
          key: i.toUpperCase(),
          value: variables[i],
          protected: false,
        },
      );
    });
    return Promise.all(variablePromises);
  }

  async run() {
    const userConfig = this.loadConfig();
    const useTempCra = await this.checkVersion();
    const api = new Gitlab({
      url: userConfig.gitlab_url,
      token: userConfig.gitlab_key,
    });

    const groupOptions = await this.getGroupList(api);
    const data: any = await this.getAnswers(groupOptions);
    // for now we're stealing the ssh key from Hub
    const sshKey: any = api.ProjectVariables.show(56, 81);
    data.variables.ssh_private_key = sshKey.value;
    const projectDirectory = `${userConfig.projects_path}/${data.project}`;

    // create gitlab group
    if (data.create_group_name) {
      await api.Groups.create({
        name: data.create_group_name,
        path: data.create_group_path,
        visibility: 'internal',
      });
    }

    // create gitlab project
    const project = await api.Projects.create({
      name: data.project,
      path: data.project_path,
      namespace_id: data.group.id,
      visibility: 'internal',
      default_branch: 'stable',
    });
    // create the local project
    await this.installCra(userConfig, data, useTempCra);
    await this.installReactAdmin(projectDirectory);
    await this.copyFiles(projectDirectory);
    this.editTsconfig(projectDirectory);
    await this.setupGit(projectDirectory, data.group.path, data.project);
    await this.setupGitlabVariables(data.variables, api, project.id);
  }
}
