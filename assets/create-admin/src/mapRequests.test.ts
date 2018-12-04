import { mappedRequests } from './mapRequests';

let dataProvider: any;

beforeEach(() => {
  dataProvider = jest.fn();
});

it('maps /users to /api/v1/rest/users', () => {
  mappedRequests(dataProvider)('CREATE', 'users', {});

  expect(dataProvider).toHaveBeenCalledWith('CREATE', 'api/v1/rest/users', {});
});

it('leaves /unmapped as /unmapped', () => {
  mappedRequests(dataProvider)('CREATE', 'unmapped', {});

  expect(dataProvider).toHaveBeenCalledWith('CREATE', 'unmapped', {});
});
