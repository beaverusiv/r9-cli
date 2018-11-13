import { Command, flags } from '@oclif/command';
import * as inquirer from 'inquirer';
import { join } from 'path';
import * as shell from 'shelljs';
import { getPivotalProjects, getPivotalStories, setPivotalStoryState } from '../lib/pivotal';
import { checkBinaryDependencies } from '../lib/dependencies';
import { Verbosity } from '../types/verbosity.enum';
import { getConfig } from '../lib/config';
import { UserConfig } from '../types/user-config';

export default class Config extends Command {
  static description = 'Create a new twgit feature sourced from Pivotal Tracker';

  static flags = {
    verbosity: flags.integer({
      char: 'v',
      description:
        'Set the output level for the command. 0 removes all output, 1 is default, maximum is 3.',
    }),
  };

  async run() {
    const { flags } = this.parse(Config);
    const verbosity: Verbosity = <number>flags.verbosity;

    if (!checkBinaryDependencies(
      [
        'git',
        'twgit',
      ],
      verbosity,
    )) {
      return 1;
    }

    const userConfig: UserConfig | null =
      await getConfig(join(this.config.configDir, 'config.json'), verbosity);
    if (userConfig === null) {
      return 2;
    }

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
