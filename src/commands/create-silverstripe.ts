import { Command } from '@oclif/command';
import * as inquirer from 'inquirer';
import Gitlab from 'gitlab';
import { join } from 'path';
import * as urlSlug from 'url-slug';
import * as shell from 'shelljs';
import { checkBinaryDependency } from '../lib/dependencies';
import { getConfig } from '../lib/config';
import * as Listr from 'listr';
import { runCmd } from '../lib/shell';
import { composerCreateProject, composerInstallDev } from '../lib/composer';
import { safeDump, safeLoad } from 'js-yaml';
import { readFile, writeFile } from 'fs';
import { promisify } from 'util';

const readFilePromise = promisify(readFile);
const writeFilePromise = promisify(writeFile);

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
    const initialAnswers = await inquirer.prompt([
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
    initialAnswers.deployments = [];
    const deployQuestions = [
      {
        name: 'stage',
        message: 'Deploy stage? (dev,uat,prod,...): ',
        validate: (input: string) =>
          input.length ? true : 'Please enter at least 1 character',
      },
      {
        name: 'host',
        message: 'Host: ',
        default: (answers: any) =>
          `${initialAnswers.project_path}.${answers.stage}.room9.nz`,
      },
    ];
    const addAnotherDeployQuestion = [
      {
        name: 'cont',
        type: 'confirm',
        message: 'Add another deployment: ',
      },
    ];

    do {
      const answers = await inquirer.prompt(deployQuestions);
      initialAnswers.deployments.push(answers);
    } while (((await inquirer.prompt(addAnotherDeployQuestion)) as any).cont);
    return initialAnswers;
  }

  async installSilverstripe(userConfig: any, data: any) {
    shell.pushd('-q', userConfig.projects_path);
    composerCreateProject(data.project, 'silverstripe/installer');
    composerInstallDev('squizlabs/php_codesniffer', '3.*');
    shell.popd('-q');
  }

  async copyFiles(projectDirectory: string) {
    const pathToFiles = join(__dirname, '../assets/create-silverstripe');
    runCmd(`cp -R ${pathToFiles}/. ${projectDirectory}/`);
  }

  async editFiles(
    projectDirectory: string,
    projectName: string,
    projectPath: string,
    groupName: string,
    deployments: any[],
  ) {
    shell.sed(
      '-i',
      'PROJECT_NAME',
      projectName,
      `${projectDirectory}/README.md`,
    );
    shell.sed('-i', 'GROUP_NAME', groupName, `${projectDirectory}/README.md`);
    shell.sed(
      '-i',
      'PROJECT_NAME',
      projectPath,
      `${projectDirectory}/docker-compose.development.yml`,
    );
    shell.sed(
      '-i',
      'PROJECT_NAME',
      projectPath,
      `${projectDirectory}/docker-compose.production.yml`,
    );
    shell.sed(
      '-i',
      'PROJECT_NAME',
      projectPath,
      `${projectDirectory}/package.json`,
    );
    shell.sed(
      '-i',
      'GROUP_NAME',
      groupName,
      `${projectDirectory}/package.json`,
    );
    const ciConfig = safeLoad(
      await readFilePromise(`${projectDirectory}/.gitlab-ci.yml`, {
        encoding: 'utf-8',
      }),
    );
    deployments.forEach((deploy) => {
      if (deploy.stage === 'prod') {
        deploy.stage = 'production';
      }
      ciConfig[`deploy to ${deploy.stage}`] = {
        stage: 'deploy',
        environment: deploy.stage,
        script: [
          'composer global require "deployer/deployer:4.3.0" --quiet',
          'composer global require "deployer/recipes:4.0.7" --quiet',
          `~/.composer/vendor/deployer/deployer/bin/dep deploy ${
            deploy.stage
          } --tag="$CI_BUILD_REF_NAME" -vvv`,
        ],
      };
      if (deploy.stage === 'production') {
        ciConfig[`deploy to ${deploy.stage}`].when = 'manual';
        ciConfig[`deploy to ${deploy.stage}`].only = ['tags'];
      } else {
        ciConfig[`deploy to ${deploy.stage}`].when = 'on_success';
        ciConfig[`deploy to ${deploy.stage}`].only = ['/^demo-.*$/', 'tags'];
      }
    });
    await writeFilePromise(
      `${projectDirectory}/.gitlab-ci.yml`,
      safeDump(ciConfig, { lineWidth: 9999 }),
      { encoding: 'utf-8' },
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

  async setupGitlabVariables(
    variables: any,
    api: any,
    projectId: number,
    deployments: any[],
  ) {
    variables.deploy_servers = safeDump(
      deployments.reduce((retVal, deploy) => {
        retVal[`${deploy.host}-${deploy.stage}`] = {
          host: deploy.host,
          user: 'deploy',
          forward_agent: true,
          stage: deploy.stage,
          deploy_path: `/srv/${deploy.host}`,
        };
        return retVal;
      }, {}),
    );
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
                  title: 'Fetching Gitlab variables',
                  // for now we're stealing the variables from Hub
                  task: async (ctx) => {
                    ctx.sshKey = await ctx.api.ProjectVariables.show(
                      56,
                      'SSH_PRIVATE_KEY',
                    );
                    ctx.sonarKey = await ctx.api.ProjectVariables.show(
                      56,
                      'SONAR_API_KEY',
                    );
                    ctx.sonarUrl = await ctx.api.ProjectVariables.show(
                      56,
                      'SONAR_URL',
                    );
                  },
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
      userConfig,
      api,
      groupOptions,
      sshKey,
      sonarKey,
      sonarUrl,
    } = await preTasks.run();

    const data: any = await this.getAnswers(groupOptions);
    data.variables = {};
    data.variables.ssh_private_key = sshKey.value;
    data.variables.sonar_api_key = sonarKey.value;
    data.variables.sonar_url = sonarUrl.value;
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
                      data.deployments,
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
                      data.deployments,
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
