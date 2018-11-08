import { Application } from '@feathersjs/feathers'
import { EventEmitter } from 'events'

declare module '@feathersjs/feathers' {
  interface Application<ServiceTypes = any> extends EventEmitter {
    settings: any
  }
}
