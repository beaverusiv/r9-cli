import { Command } from '@oclif/command';
import * as inquirer from 'inquirer';
import Gitlab from 'gitlab';
import { gte } from 'semver';
import { join } from 'path';
import * as editJsonFile from 'edit-json-file';
import * as urlSlug from 'url-slug';
import * as shell from 'shelljs';
import { npmInstall, npmInstallDev } from '../lib/npm';
import { checkBinaryDependency } from '../lib/dependencies';
import { getConfig } from '../lib/config';
import * as Listr from 'listr';
import { runCmd } from '../lib/shell';

export default class CreateAdmin extends Command {
  static description =
    'Create a new react-admin project, ' +
    'including the Gitlab project and stable/demo-integration branches';

  async checkVersion(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      shell.exec(
        'create-react-app -V',
        { silent: true },
        (code: number, stdout: string) => {
          let useTempCra: boolean = true;

          if (stdout) {
            if (gte(stdout, '2.1.0')) {
              useTempCra = false;
            }
          }
          resolve(useTempCra);
        },
      );
    });
  }

  async getGroupList(api: any): Promise<any[]> {
    const groups = await api.Groups.all();
    const groupOptions: { name: string; value: any }[] = groups.map(
      (group: any) => ({
        name: group.name,
        value: { id: group.id, path: group.path },
      }),
    );
    groupOptions.push({ name: 'Create new group', value: 'create_new' });
    return groupOptions;
  }

  async getAnswers(groupOptions: any[]) {
    return inquirer.prompt([
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
        default: (answers: any) =>
          `https://${answers.project_path}-api.dev.room9.nz`,
      },
      {
        name: 'variables.uat_api_url',
        message: 'UAT API URL: ',
        default: (answers: any) =>
          answers.variables.dev_api_url.replace('.dev.', '.uat.'),
      },
      {
        name: 'variables.prod_api_url',
        message: 'Production API URL: ',
        default: (answers: any) =>
          answers.variables.dev_api_url.replace('.dev.', '.prod.'),
      },
      {
        name: 'variables.dev_url',
        message: 'Development Admin URL: ',
        default: (answers: any) =>
          answers.variables.dev_api_url.replace('-api.', '.'),
      },
      {
        name: 'variables.uat_url',
        message: 'UAT Admin URL: ',
        default: (answers: any) =>
          answers.variables.dev_url.replace('.dev.', '.uat.'),
      },
      {
        name: 'variables.prod_url',
        message: 'Production Admin URL: ',
        default: (answers: any) =>
          answers.variables.dev_url.replace('.dev.', '.prod.'),
      },
    ]);
  }

  async installCra(userConfig: any, data: any, useTempCra: boolean) {
    shell.pushd('-q', userConfig.projects_path);
    const args: string = `${useTempCra ? '--package ' : ''} ${
      data.project
    } --typescript`;
    runCmd(`npx create-react-app ${args}`);
    shell.popd('-q');
  }

  async installReactAdmin(projectDirectory: string) {
    shell.pushd('-q', projectDirectory);
    npmInstall([
      'react-admin',
      '@feathersjs/client',
      '@room9/ra-feathers-client',
    ]);
    npmInstallDev([
      'ra-data-fakerest',
      '@feathersjs/feathers',
      '@types/node',
      '@types/feathersjs__feathers',
      '@types/react',
    ]);
    shell.popd('-q');
  }

  async copyFiles(projectDirectory: string) {
    const pathToFiles = join(__dirname, '../assets/create-admin');
    runCmd(`cp -R ${pathToFiles}/* ${projectDirectory}/`);
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
    shell.pushd('-q', `${projectDirectory}`);
    runCmd(`git remote add origin git@git.room9.co.nz:${group}/${project}.git`);
    runCmd('git add -A');
    runCmd('git commit --amend -am "Initial commit"');
    // TODO: pushing stable first results in the initial commit getting rejected. update Gitlab to 11.2+ to re-enable
    runCmd('git branch -m stable');
    runCmd('git push -u origin stable');
    runCmd('git tag v0.1.0');
    runCmd('git push -u origin --tags');
    runCmd('twgit demo start integration');
    shell.popd('-q');
  }

  async setupGitlabVariables(variables: any, api: any, projectId: number) {
    const variablePromises: Promise<any>[] = [];
    Object.keys(variables).forEach((i: string) => {
      return api.ProjectVariables.create(projectId, {
        key: i.toUpperCase(),
        value: variables[i],
        protected: false,
      });
    });
    return Promise.all(variablePromises);
  }

  async run() {
    const binDeps: string[] = ['npx', 'git', 'twgit'];

    const preTasks = new Listr(
      [
        {
          title: 'Checking prerequisites',
          task: (ctx) => {
            return new Listr(
              [
                ...binDeps.map((dep) => ({
                  title: `Checking for ${dep}`,
                  task: () => checkBinaryDependency(dep),
                })),
                {
                  title: 'Checking create-react-app version',
                  task: async () =>
                    (ctx.useTempCra = await this.checkVersion()),
                },
                {
                  title: 'Loading user config file',
                  task: async () => {
                    ctx.userConfig = await getConfig(
                      join(this.config.configDir, 'config.json'),
                    );
                    ctx.api = new Gitlab({
                      url: ctx.userConfig.gitlab_url,
                      token: ctx.userConfig.gitlab_key,
                    });
                  },
                },
              ],
              { concurrent: true },
            );
          },
        },
        {
          title: 'Fetching info from Gitlab',
          task: () => {
            return new Listr(
              [
                {
                  title: 'Fetching Gitlab groups',
                  task: async (ctx) =>
                    (ctx.groupOptions = await this.getGroupList(ctx.api)),
                },
                {
                  title: 'Fetching Gitlab deploy key',
                  // for now we're stealing the ssh key from Hub
                  task: async (ctx) =>
                    (ctx.sshKey = await ctx.api.ProjectVariables.show(
                      56,
                      'SSH_PRIVATE_KEY',
                    )),
                },
              ],
              { concurrent: true },
            );
          },
        },
      ],
      {},
    );

    const {
      useTempCra,
      userConfig,
      api,
      groupOptions,
      sshKey,
    } = await preTasks.run();

    const data: any = await this.getAnswers(groupOptions);
    data.variables.ssh_private_key = sshKey.value;
    const projectDirectory = `${userConfig.projects_path}/${data.project}`;

    const postTasks = new Listr(
      [
        {
          title: 'Setting up project',
          task: (ctx) => {
            return new Listr(
              [
                {
                  title: 'Setting up Gitlab',
                  task: () => {
                    return new Listr(
                      [
                        {
                          title: 'Creating group',
                          task: async () =>
                            api.Groups.create({
                              name: data.create_group_name,
                              path: data.create_group_path,
                              visibility: 'internal',
                            }),
                          skip: () => {
                            if (!data.create_group_name) {
                              return 'Using existing group';
                            }
                            return false;
                          },
                        },
                        {
                          title: 'Creating project',
                          task: async () => {
                            const project = await api.Projects.create({
                              name: data.project,
                              path: data.project_path,
                              namespace_id: data.group.id,
                              visibility: 'internal',
                              default_branch: 'stable',
                            });
                            ctx.projectId = project.id;
                            await api.ProjectMembers.add(
                              ctx.projectId,
                              userConfig.gitlab_id,
                              40, // Master
                            );
                          },
                        },
                      ],
                      {},
                    );
                  },
                },
                {
                  title: 'Setting up project skeleton',
                  task: () => {
                    return new Listr(
                      [
                        {
                          title: 'Running create-react-app',
                          task: async () =>
                            this.installCra(userConfig, data, useTempCra),
                        },
                        {
                          title: 'Installing react-admin',
                          task: async () =>
                            this.installReactAdmin(projectDirectory),
                        },
                      ],
                      {},
                    );
                  },
                },
              ],
              { concurrent: true },
            );
          },
        },
        {
          title: 'Configuring project',
          task: () => {
            return new Listr(
              [
                {
                  title: 'Copying files',
                  task: async () => this.copyFiles(projectDirectory),
                },
                {
                  title: 'Edit tsconfig.json',
                  task: () => this.editTsconfig(projectDirectory),
                },
              ],
              { concurrent: true },
            );
          },
        },
        {
          title: 'Finishing project setup',
          task: (ctx) => {
            return new Listr(
              [
                {
                  title: 'Setup git repository',
                  task: async () =>
                    this.setupGit(
                      projectDirectory,
                      data.group.path,
                      data.project,
                    ),
                },
                {
                  title: 'Setup gitlab variables',
                  task: () =>
                    this.setupGitlabVariables(
                      data.variables,
                      api,
                      ctx.projectId,
                    ),
                },
              ],
              { concurrent: true },
            );
          },
        },
      ],
      {},
    );

    await postTasks.run();
  }
}
