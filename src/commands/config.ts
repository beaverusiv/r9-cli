import Command from '@oclif/command';
import * as inquirer from 'inquirer';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export default class Config extends Command {
  static description = 'Setup needed config for running commands like API keys';

  async run() {
    this.log('Visit https://git.room9.co.nz/profile/personal_access_tokens' +
      'and ensure you have a personal access token with api access ready for input!');
    this.log('Visit https://www.pivotaltracker.com/profile' +
      'and ensure you have a n API token ready for input!');
    // ask the questions
    let data: any = await inquirer
      .prompt([
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
      ]);
    data = JSON.stringify(data);
    mkdirSync(this.config.configDir);
    writeFileSync(join(this.config.configDir, 'config.json'), data);
  }
}
