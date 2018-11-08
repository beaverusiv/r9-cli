import feathers from '@feathersjs/client';
import { feathersDataProvider, feathersAuthProvider } from '@room9/ra-feathers-client';
import { mappedRequests } from './mapRequests';

let host = 'http://localhost:3030';
if (process.env.REACT_APP_API_HOST) {
  host = process.env.REACT_APP_API_HOST;
}
const restClient = feathers.rest(host);
const client = feathers()
  .configure(restClient.fetch(window.fetch))
  .configure(feathers.authentication({
    jwtStrategy: 'jwt',
    storage: window.localStorage,
    storageKey: 'ra-feathers-token',
    path: 'api/v1/authentication'
  }));

export const dataProvider = mappedRequests(feathersDataProvider(client));
export const authProvider = feathersAuthProvider(client);
