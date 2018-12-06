import fakeDataProvider from 'ra-data-fakerest';

const dataProvider = fakeDataProvider({
  'api/v1/rest/users': []
});

const client = jest.genMockFromModule('@room9/ra-feathers-client');
client.feathersDataProvider = () => dataProvider;
client.feathersAuthProvider = () => () => {};

module.exports = client;
