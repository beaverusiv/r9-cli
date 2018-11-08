import React, { Component } from 'react';
import { Admin, Resource } from 'react-admin';

import './App.css';
import { dataProvider, authProvider } from './providers';

class App extends Component {
  render() {
    return (
      <Admin dataProvider={dataProvider} authProvider={authProvider}>
    </Admin>
  );
  }
}

export default App;
