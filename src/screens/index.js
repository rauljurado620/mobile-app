import {Navigation, ScreenVisibilityListener} from 'react-native-navigation';

import Notes from './Notes'
import Compose from './Compose'
import Account from './Account'
import Authenticate from './Authenticate'
import Filter from './Filter'
import InputModal from './InputModal'
import Sync from '../lib/sync'

export function registerScreens() {
  Navigation.registerComponent('sn.Notes', () => Notes);
  Navigation.registerComponent('sn.Compose', () => Compose);
  Navigation.registerComponent('sn.Account', () => Account);
  Navigation.registerComponent('sn.Filter', () => Filter);
  Navigation.registerComponent('sn.InputModal', () => InputModal);
  Navigation.registerComponent('sn.Authenticate', () => Authenticate);
}

export function registerScreenVisibilityListener() {
  new ScreenVisibilityListener({
    willAppear: ({screen}) => {
      // console.log(`Displaying screen ${screen}`
    },
    didAppear: ({screen, startTime, endTime, commandType}) =>  {
      // console.log('screenVisibility', `Screen ${screen} displayed in ${endTime - startTime} millis [${commandType}]`
    },
    willDisappear: ({screen}) => {
      // console.log(`Screen will disappear ${screen}`
    },
    didDisappear: ({screen}) => {
      // console.log(`Screen disappeared ${screen}`
    }
  }).register();
}
