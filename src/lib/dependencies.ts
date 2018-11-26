import * as shell from 'shelljs';

export async function checkBinaryDependency(binary: string): Promise<boolean> {
  const path = shell.which(binary);
  if (!path) {
    return Promise.reject(
      new Error(
        `${binary} not found, please install or ensure $PATH is correct`,
      ),
    );
  }
  return Promise.resolve(true);
}
