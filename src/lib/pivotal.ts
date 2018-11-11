import { default as fetch } from 'node-fetch';

export function getPivotalProjects(url: string, headers: any): Promise<any> {
  return fetch(`${url}/projects`, headers)
    .then(res => res.json())
    .then((projects: any) => {
      return projects.map((project: any) => ({ value: project.id, name: project.name }));
    });
}

export function getPivotalStories(
  projectId: number,
  url: string,
  headers: any,
  owner: number,
): Promise<any> {
  const params: string = encodeURIComponent(`owner:${owner} (state:planned OR state:unstarted)`);
  return fetch(`${url}/projects/${projectId}/stories?filter=${params}`, headers)
    .then(res => res.json())
    .then((stories: any) => {
      return stories.map((story: any) => ({ name: story.name, value: story.id }));
    });
}

export function setPivotalStoryState(
  projectId: number,
  storyId: number,
  url: string,
  headers: any,
): Promise<any> {
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

export function getPivotalAccountId(url: string, headers: any): Promise<any> {
  return fetch(`${url}/me`, headers)
    .then(res => res.json())
    .then((account: any) => {
      return account.id;
    });
}
