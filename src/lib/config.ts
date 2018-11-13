import { readFile } from 'fs';
import { promisify } from 'util';
import * as shell from 'shelljs';
import * as ora from 'ora';
import { Verbosity } from '../types/verbosity.enum';
import { UserConfig } from '../types/user-config';

const readFilePromise = promisify(readFile);

export async function getConfig(file: string, verbosity: Verbosity): Promise<UserConfig | null> {
  let spinner;
  if (verbosity > Verbosity.Info) {
    spinner = ora(`Checking for config ${file}`).start();
  }
  const configFile: string = await readFilePromise(file, { encoding: 'utf-8' });
  if (!configFile) {
    const msg = 'Config file not found. Please run r9 config first to setup your Gitlab account';
    if (verbosity > Verbosity.Info && spinner) {
      spinner.fail(msg);
    } else {
      shell.echo(msg);
    }
    return null;
  }
  const userConfig: UserConfig = JSON.parse(configFile);
  if (!userConfig) {
    const msg = 'Config not valid JSON. Please run r9 config first to setup your Gitlab account';
    if (verbosity > Verbosity.Info && spinner) {
      spinner.fail(msg);
    } else {
      shell.echo(msg);
    }
    return null;
  }
  !!spinner && spinner.succeed(`Config file loaded from ${file}`);
  return userConfig;
}
