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
import { composerCreateProject } from '../lib/composer';

export default class CreateAdmin extends Command {
  static description =
    'Create a new Silverstripe project, ' +
    'including the Gitlab project and stable/demo-integration branches, ' +
    'and Dockerfile/.gitlab-ci.yml';

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
    ]);
  }

  async installSilverstripe(userConfig: any, data: any) {
    shell.pushd('-q', userConfig.projects_path);
    composerCreateProject(data.project);
    shell.popd('-q');
  }

  async copyFiles(projectDirectory: string) {
    const pathToFiles = join(__dirname, '../../assets/create-silverstripe');
    runCmd(`cp -R ${pathToFiles}/* ${projectDirectory}/`);
  }

  async editFiles(
    projectDirectory: string,
    projectName: string,
    projectPath: string,
    groupName: string,
  ) {
    runCmd(
      `sed -i -e 's/PROJECT_NAME/'${projectName}'/' ${projectDirectory}/README.md`,
    );
    runCmd(
      `sed -i -e 's/PROJECT_NAME/'${projectPath}'/' ${projectDirectory}/docker-compose.development.yml`,
    );
    runCmd(
      `sed -i -e 's/PROJECT_NAME/'${projectPath}'/' ${projectDirectory}/package.json`,
    );
    runCmd(
      `sed -i -e 's/GROUP_NAME/'${groupName}'/' ${projectDirectory}/package.json`,
    );
  }

  async setupGit(projectDirectory: string, group: string, project: string) {
    shell.pushd('-q', `${projectDirectory}`);
    runCmd('git init');
    runCmd(`git remote add origin git@git.room9.co.nz:${group}/${project}.git`);
    runCmd('git add -A');
    runCmd('git commit -am "Initial commit"');
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
    const binDeps: string[] = ['docker', 'git', 'twgit', 'docker-compose'];

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

    const { userConfig, api, groupOptions, sshKey } = await preTasks.run();

    const data: any = await this.getAnswers(groupOptions);
    data.variables = {};
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
                          task: async () => {
                            data.group = await api.Groups.create({
                              name: data.create_group_name,
                              path: data.create_group_path,
                              visibility: 'internal',
                            });
                          },
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
                          title: 'Running composer create-project',
                          task: async () =>
                            this.installSilverstripe(userConfig, data),
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
                  title: 'Editing files',
                  task: async () =>
                    this.editFiles(
                      projectDirectory,
                      data.project_path,
                      data.project,
                      data.group.path,
                    ),
                },
              ],
              {},
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
