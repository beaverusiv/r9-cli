import Command from '@oclif/command';
import * as inquirer from 'inquirer';
import { default as fetch } from 'node-fetch';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as shell from 'shelljs';

export default class Config extends Command {
  static description = 'Create a new twgit feature sourced from Pivotal Tracker';

  async getPivotalProjects(url: string, headers: any) {
    return fetch(`${url}/projects`, headers)
      .then(res => res.json())
      .then((projects: any) => {
        return projects.map((project: any) => ({ value: project.id, name: project.name }));
      });
  }

  async getPivotalStories(projectId: number, url: string, headers: any) {
    return fetch(`${url}/projects/${projectId}/stories?with_state=unstarted`, headers)
      .then(res => res.json())
      .then((stories: any) => {
        return stories.map((story: any) => ({ name: story.name, value: story.id }));
      });
  }

  async setPivotalStoryState(projectId: number, storyId: number, url: string, headers: any) {
    return fetch(`${url}/projects/${projectId}/stories/${storyId}`, headers)
      .then(res => res.json())
      .then((story: any) => {
        story.current_state = 'started';
        const newHeaders: any = { ...headers };
        newHeaders['Content-Type'] = 'application/json';
        return fetch(
          `${url}/projects/${projectId}/stories/${storyId}`,
          {
            headers: newHeaders,
            method: 'put',
            body: JSON.stringify(story),
          },
        );
      });
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

  async run() {
    const userConfig: any = this.loadConfig();
    const headers = { headers: { 'X-TrackerToken': userConfig.pivotal_key } };
    const data: any = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'pivotal_project',
          message: 'Select a project: ',
          choices: await this.getPivotalProjects(userConfig.pivotal_url, headers),
        },
        {
          type: 'list',
          name: 'pivotal_story',
          message: 'Select a story: ',
          choices: async (answers: any) => {
            return this.getPivotalStories(answers.pivotal_project, userConfig.pivotal_url, headers);
          },
        },
      ]);
    // TODO: filter stories on assigned to user
    shell.exec(`twgit feature start ${data.pivotal_story}`);
    // set pivotal story to 'started'
    await this.setPivotalStoryState(
      data.pivotal_project,
      data.pivotal_story,
      userConfig.pivotal_url,
      headers,
    );
  }
}
