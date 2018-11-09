import Command from '@oclif/command';
import * as inquirer from 'inquirer';
import { default as fetch } from 'node-fetch';

const PT_URL = 'https://www.pivotaltracker.com/services/v5';
const PT_HEADERS = { headers: { 'X-TrackerToken': '89307b23b0db4adc47717f05277df5c2' } };

export default class Config extends Command {
  static description = 'Create a new twgit feature sourced from Pivotal Tracker';

  async getPivotalProjects() {
    return fetch(`${PT_URL}/projects`, PT_HEADERS)
      .then(res => res.json())
      .then((projects: any) => {
        return projects.map((project: any) => ({ value: project.id, name: project.name }));
      });
  }

  async getPivotalStories(projectId: number) {
    return fetch(`${PT_URL}/projects/${projectId}/stories?with_state=unstarted`, PT_HEADERS)
      .then(res => res.json())
      .then((stories: any) => {
        return stories.map((story: any) => ({ name: story.name, value: story.id }));
      });
  }

  async setPivotalStoryState(projectId: number, storyId: number) {
    return fetch(`${PT_URL}/projects/${projectId}/stories/${storyId}`, PT_HEADERS)
      .then(res => res.json())
      .then((story: any) => {
        story.current_state = 'started';
        const headers: any = { ...PT_HEADERS };
        headers['Content-Type'] = 'application/json';
        return fetch(
          `${PT_URL}/projects/${projectId}/stories/${storyId}`,
          {
            headers,
            method: 'put',
            body: JSON.stringify(story),
          },
        );
      });
  }

  async run() {
    const data: any = await inquirer
      .prompt([
        {
          type: 'list',
          name: 'pivotal_project',
          message: 'Select a project: ',
          choices: await this.getPivotalProjects(),
        },
        {
          type: 'list',
          name: 'pivotal_story',
          message: 'Select a story: ',
          choices: async (answers: any) => this.getPivotalStories(answers.pivotal_project),
        },
      ]);
    // TODO: filter stories on assigned to user
    // TODO: twgit feature start ${data.pivotal_story}
    // set pivotal story to 'started'
    await this.setPivotalStoryState(data.pivotal_project, data.pivotal_story);
  }
}
