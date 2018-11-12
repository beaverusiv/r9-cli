import Command from '@oclif/command';
import * as inquirer from 'inquirer';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as shell from 'shelljs';
import { getPivotalProjects, getPivotalStories, setPivotalStoryState } from '../lib/pivotal';

export default class Config extends Command {
  static description = 'Create a new twgit feature sourced from Pivotal Tracker';

  checkDependencies(): boolean {
    if (!shell.which('twgit')) {
      shell.echo('This tool requires twgit installed: https://github.com/Twenga/twgit');
      return false;
    }
    return true;
  }

  getConfig() {
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

  async run() {
    if (!this.checkDependencies()) {
      return 1;
    }

    const userConfig: any = this.getConfig();
    const headers = { headers: { 'X-TrackerToken': userConfig.pivotal_key } };
    const data: any = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'pivotal_project',
          message: 'Select a project: ',
          choices: await getPivotalProjects(userConfig.pivotal_url, headers),
        },
        {
          type: 'list',
          name: 'pivotal_story',
          message: 'Select a story: ',
          choices: async (answers: any) => {
            return getPivotalStories(
              answers.pivotal_project,
              userConfig.pivotal_url,
              headers,
              userConfig.account_id,
            );
          },
        },
      ]);
    shell.exec(`twgit feature start ${data.pivotal_story}`);
    // set pivotal story to 'started'
    await setPivotalStoryState(
      data.pivotal_project,
      data.pivotal_story,
      userConfig.pivotal_url,
      headers,
    );
  }
}
