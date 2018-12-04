import Command from '@oclif/command';
import * as inquirer from 'inquirer';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getPivotalAccountId } from '../lib/pivotal';
import Gitlab from 'gitlab';
import { UserConfig } from '../types/user-config';
import * as shell from 'shelljs';

export default class Config extends Command {
  static description = 'Setup needed config for running commands like API keys';

  async run() {
    this.log(
      'Visit https://git.room9.co.nz/profile/personal_access_tokens ' +
        'and ensure you have a personal access token with api access ready for input!',
    );
    this.log(
      'Visit https://www.pivotaltracker.com/profile ' +
        'and ensure you have an API token ready for input!',
    );
    // ask the questions
    const data: UserConfig = (await inquirer.prompt([
      {
        name: 'gitlab_url',
        message: 'Gitlab URL: ',
        default: 'https://git.room9.co.nz',
      },
      {
        name: 'projects_path',
        message: 'Path for creating new projects: ',
        default: `${process.env.HOME}/code`,
      },
      {
        name: 'gitlab_key',
        message: 'Private access token: ',
      },
      {
        name: 'pivotal_url',
        message: 'Pivotal Tracker URL: ',
        default: 'https://www.pivotaltracker.com/services/v5',
      },
      {
        name: 'pivotal_key',
        message: 'Pivotal Tracker API token: ',
      },
    ])) as UserConfig;
    const api = new Gitlab({
      url: data.gitlab_url,
      token: data.gitlab_key,
    });
    await Promise.all([
      api.Users.current(),
      getPivotalAccountId(data.pivotal_url, {
        headers: { 'X-TrackerToken': data.pivotal_key },
      }),
    ]).then((results: any[]) => {
      data.gitlab_id = results[0].id;
      data.account_id = results[1];
    });
    if (!existsSync(this.config.configDir)) {
      shell.mkdir('-p', this.config.configDir);
    }
    writeFileSync(
      join(this.config.configDir, 'config.json'),
      JSON.stringify(data),
    );
  }
}
