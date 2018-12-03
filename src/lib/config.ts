import { readFile } from 'fs';
import { promisify } from 'util';
import { UserConfig } from '../types/user-config';

const readFilePromise = promisify(readFile);

export async function getConfig(file: string): Promise<UserConfig | null> {
  const configFile: string = await readFilePromise(file, { encoding: 'utf-8' });
  if (!configFile) {
    throw new Error(`Could not find config ${file}`);
  }
  const userConfig: UserConfig = JSON.parse(configFile);
  if (!userConfig) {
    throw new Error('Could not parse JSON contents of config');
  }
  return userConfig;
}
