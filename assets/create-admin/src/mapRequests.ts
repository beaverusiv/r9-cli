const resourceMap: any = {
  users: {
    resource: 'api/v1/rest/users',
  },
};

export const mappedRequests = (dataProvider: any) => {
  return (type: string, resource: string, params: any) => {
    if (resource in resourceMap) {
      const newValues = resourceMap[resource];
      resource = newValues.resource;
      params = Object.assign(params, newValues.params);
    }
    return dataProvider(type, resource, params);
  };
};
