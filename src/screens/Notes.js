import React, { Component } from 'react';
import { StyleSheet, View, Platform, Text, StatusBar, Modal, Alert } from 'react-native';
import ModelManager from '../lib/modelManager'
import Storage from '../lib/storage'
import Sync from '../lib/sync'
import Auth from '../lib/auth'
import KeysManager from '../lib/keysManager'
import AlertManager from '../lib/alertManager'
import GlobalStyles from "../Styles"
import Keychain from "../lib/keychain"
import Icons from '../Icons';
import NoteList from "../containers/NoteList"
import Abstract from "./Abstract"
import OptionsState from "../OptionsState"
import App from "../app"
import AuthModal from "../containers/AuthModal"
import LockedView from "../containers/LockedView"
import ApplicationState from "../ApplicationState";

export default class Notes extends Abstract {

  constructor(props) {
    super(props);

    this.rendersLockscreen = true;

    this.stateObserver = ApplicationState.get().addStateObserver((state) => {
      if(state == ApplicationState.Resuming) {
        // we only want to perform sync here if the app is resuming, not if it's a fresh start
        if(this.dataLoaded) {
          Sync.get().sync();
        }

        var authProps = ApplicationState.get().getAuthenticationPropsForAppState(state);
        if((authProps.passcode || authProps.fingerprint)) {
          // Android can handle presenting modals no matter which screen you're on
          if(App.isIOS) {
            // The auth modal is only presented if the Notes screen is visible.
            this.props.navigator.popToRoot();

            // Don't use the below as it will also for some reason dismiss the non RNN auth modal as well
            // this.props.navigator.dismissAllModals({animationType: 'none'});

            this.props.navigator.switchToTab({
              tabIndex: 0
            });
          }
        }
      }
    })
  }

  unlockContent() {
    super.unlockContent();
    this.configureNavBar(true);
  }

  loadInitialState() {
    this.options = App.get().globalOptions();

    this.mergeState({
      refreshing: false,
      decrypting: false,
      loading: true,
    });

    this.registerObservers();
    this.loadTabbarIcons();
    this.initializeNotes();
    this.beginSyncTimer();

    super.loadInitialState();
  }

  componentWillUnmount() {
    super.componentWillUnmount();
    ApplicationState.get().removeStateObserver(this.stateObserver);

    Sync.get().removeEventHandler(this.syncObserver);
    Sync.get().removeSyncStatusObserver(this.syncStatusObserver);

    Auth.getInstance().removeEventObserver(this.signoutObserver);
    if(this.options) {
      this.options.removeChangeObserver(this.optionsObserver);
    }
    clearInterval(this.syncTimer);
  }

  beginSyncTimer() {
    // Refresh every 30s
    this.syncTimer = setInterval(function () {
      Sync.get().sync(null);
    }, 30000);
  }

  registerObservers() {
    this.optionsObserver = this.options.addChangeObserver((options) => {
      this.reloadList(true);
      // On iOS, configureNavBar would be handle by viewWillAppear. However, we're using a drawer in Android.
      if(Platform.OS == "android" && !this.skipUpdatingNavBar) {
        this.configureNavBar();
      }
    })

    this.syncObserver = Sync.get().addEventHandler((event, data) => {
      if(event == "sync:completed") {
        if(_.find(data.retrievedItems, {content_type: "Note"}) || _.find(data.unsavedItems, {content_type: "Note"})) {
          this.reloadList();
        }
        this.mergeState({refreshing: false, loading: false});
      }
    })

    this.syncStatusObserver = Sync.get().registerSyncStatusObserver((status) => {
      if(status.error) {
        var text = `Unable to connect to sync server.`
        setTimeout( () => {
          // need timeout for syncing on app launch
          this.setStatusBarText(text);
        }, 250);
      } else if(status.retrievedCount > 20) {
        var text = `Downloading ${status.retrievedCount} items. Keep app opened.`
        this.setStatusBarText(text);
        this.showingDownloadStatus = true;
      } else if(this.showingDownloadStatus) {
        this.showingDownloadStatus = false;
        var text = "Download Complete.";
        this.setStatusBarText(text);
        setTimeout(() => {
          this.setStatusBarText(null);
        }, 2000);
      } else {
        this.setStatusBarText(null);
      }
    })

    this.signoutObserver = Auth.getInstance().addEventObserver([Auth.DidSignOutEvent, Auth.WillSignInEvent, Auth.DidSignInEvent], (event) => {
      if(event == Auth.WillSignInEvent) {
        this.mergeState({loading: true})
      } else if(event == Auth.DidSignInEvent) {
        // Check if there are items that are errorDecrypting and try decrypting with new keys
        Sync.get().refreshErroredItems().then(() => {
          this.reloadList();
        })
      } else if(event == Auth.DidSignOutEvent) {
        this.setStatusBarText(null);
      }
    });
  }

  setStatusBarText(text) {
    this.mergeState({showSyncBar: text != null, syncBarText: text});
  }

  loadTabbarIcons() {
    if(!App.get().isIOS) {
      return;
    }
    this.props.navigator.setTabButton({
      tabIndex: 0,
      icon: Icons.getIcon('ios-menu-outline'),
      selectedIcon: Icons.getIcon('ios-menu-outline')
    });
    this.props.navigator.setTabButton({
      tabIndex: 1,
      icon: Icons.getIcon('ios-contact-outline'),
      selectedIcon: Icons.getIcon('ios-contact-outline')
    });
  }

  initializeNotes() {
    var encryptionEnabled = KeysManager.get().isOfflineEncryptionEnabled();
    this.mergeState({decrypting: encryptionEnabled, loading: !encryptionEnabled})

    this.setStatusBarText(encryptionEnabled ? "Decrypting notes..." : "Loading notes...");
    let incrementalCallback = () => {
      // Incremental Callback
      if(!this.dataLoaded) {
        this.dataLoaded = true;
        this.configureNavBar(true);
      }
      this.reloadList();
    }

    Sync.get().loadLocalItems(incrementalCallback).then((items) => {
      setTimeout(() => {
        this.setStatusBarText("Syncing...");
        this.displayNeedSignInAlertForLocalItemsIfApplicable(items);
        this.dataLoaded = true;
        this.reloadList();
        this.configureNavBar(true);
        this.mergeState({decrypting: false, loading: false});
        // perform initial sync
        Sync.get().sync().then(() => {
          this.setStatusBarText(null);
        });
      }, 0);
    });
  }

  /* If there is at least one item that has an error decrypting, and there are no account keys saved,
    display an alert instructing the user to log in. This happens when restoring from iCloud and data is restored but keys are not.
   */
  displayNeedSignInAlertForLocalItemsIfApplicable(items) {
    if(!items || KeysManager.get().hasAccountKeys()) {
      return;
    }

    var needsDecrypt = false;
    for(var item of items) {
      if(item.errorDecrypting) {
        needsDecrypt = true;
        break;
      }
    }

    if(needsDecrypt) {
      Alert.alert("Missing Keys", "Some of your items cannot be decrypted because the keys are missing. This can happen if you restored your device from backup. Please sign in to restore your data.");
    }
  }

  configureNavBar(initial = false) {

    if(this.state.lockContent || !this.visible || !this.willBeVisible) {
      this.needsConfigureNavBar = true;
      return;
    }

    if(!this.dataLoaded) {
      this.notesTitle = "Notes";
      this.props.navigator.setTitle({title: this.notesTitle, animated: false});
      this.needsConfigureNavBar = true;
      return;
    }

    this.needsConfigureNavBar = false;

    super.configureNavBar();

    var options = this.options;

    var notesTitle = "Notes";
    var filterTitle = "Filter";
    var numTags = options.selectedTags.length;

    if(App.isIOS && (numTags > 0 || options.archivedOnly)) {
      if(numTags > 0) {
        filterTitle += ` (${numTags})`
      }
      notesTitle = options.archivedOnly ? "Archived Notes" : "Filtered Notes";
    }

    // Android only allows 1 tag selection
    if(App.isAndroid) {
      if(numTags > 0) {
        var tags = ModelManager.get().findItems(options.selectedTags);
        if(tags.length > 0) {
          var tag = tags[0];
          notesTitle = tag.title + " notes";
        } else {
          notesTitle = "Notes";
        }
      }

      if(options.archivedOnly) {
        notesTitle = "Archived " + notesTitle;
      }
    }

    if(notesTitle !== this.notesTitle) {
      // no changes, return. We do this so when swiping back from compose to here,
      // we don't change the title while a transition is taking place
      this.notesTitle = notesTitle;

      this.props.navigator.setTitle({title: notesTitle, animated: false});
    }

    if(!initial && App.isIOS && filterTitle === this.filterTitle) {
      // On Android, we want to always run the bottom code in the case of the FAB that doesn't
      // reappaer if on the next screen a keyboard is present and you hit back.
      // on iOS, navigation button stack is saved so it only needs to be configured once
      return;
    }

    this.filterTitle = filterTitle;

    var rightButtons = [];
    if(App.get().isIOS) {
      rightButtons.push({
        title: 'New',
        id: 'new',
        showAsAction: 'ifRoom',
      })
    } else {
      rightButtons.push({
        title: 'Settings',
        id: 'settings',
        showAsAction: 'ifRoom',
        icon: Icons.getIcon('md-settings'),
      })
    }

    this.props.navigator.setButtons({
      rightButtons: rightButtons,
      leftButtons: [
        {
          title: filterTitle,
          id: 'sideMenu',
          showAsAction: 'ifRoom',
        },
      ],
      fab: {
        collapsedId: 'new',
        collapsedIcon: Icons.getIcon('md-add'),
        backgroundColor: GlobalStyles.constants().mainTintColor
      },
      animated: false
    });
  }

  onNavigatorEvent(event) {

    super.onNavigatorEvent(event);

    if(event.id == "willAppear" || event.id == "didAppear") {
      if(event.id == "willAppear") {
        this.forceUpdate();
      }
      else if(event.id == "didAppear") {
        if(this.needsConfigureNavBar) {
          this.configureNavBar(false);
        }
      }
      if(this.loadNotesOnVisible) {
        this.loadNotesOnVisible = false;
        this.reloadList();
      }
    }

    if(event.type == 'NavBarButtonPress') {

      // During incremental load, we wan't to avoid race conditions where we wait for navigator callback for this
      // to be set in Abstract. Setting it here immediately will avoid updating the nav bar while we navigated away.
      // Don't set this for Android if just opening side menu.
      this.willBeVisible = (App.isAndroid && event.id == 'sideMenu'); // this value is only false (what we want) if it's not Android side menu

      if (event.id == 'new') {
        this.presentNewComposer();
      } else if (event.id == 'sideMenu') {
        // Android is handled by the drawer attribute of rn-navigation
        if(Platform.OS == "ios") {
          this.presentFilterScreen();
        }
      } else if(event.id == "settings") {
        this.presentSettingsScreen();
      }
    }
  }

  presentNewComposer() {
    this.props.navigator.push({
      screen: 'sn.Compose',
      title: 'Compose',
      passProps: {selectedTagId: this.selectedTags.length && this.selectedTags[0].uuid}, // For Android
    });
  }

  presentFilterScreen() {
    this.props.navigator.showModal({
      screen: 'sn.Filter',
      title: 'Options',
      animationType: 'slide-up',
      passProps: {
        options: JSON.stringify(this.options),
        onOptionsChange: (options) => {
          this.options.mergeWith(options);
        }
      }
    });
  }

  presentSettingsScreen() {
    this.props.navigator.showModal({
      screen: 'sn.Account',
      title: 'Account',
      animationType: 'slide-up'
    });
  }

  reloadList(force) {
    if(!this.visible && !this.willBeVisible && !force) {
      console.log("===Scheduling Notes Render Update===");
      this.loadNotesOnVisible = true;
      return;
    }

    console.log("===Reload Notes List===");

    this.forceUpdate();
    this.mergeState({refreshing: false})
  }

  _onRefresh() {
    this.setState({refreshing: true});
    Sync.get().sync();
  }

  _onPressItem = (item: hash) => {
    var run = () => {
      if(item.conflictOf) {
        item.conflictOf = null;
      }

      this.props.navigator.push({
        screen: 'sn.Compose',
        title: 'Compose',
        passProps: {noteId: item.uuid},
        animationType: "slide-horizontal"
      });
    }

    if(item.errorDecrypting) {
      Alert.alert("Unable to Decrypt", "This note could not be decrypted. Perhaps it was encrypted with another key? Please try signing out then signing back in, or visit standardnotes.org/help to learn more.");
    } else {
      run();
    }
  }

  onSearchTextChange = (text) => {
    this.skipUpdatingNavBar = true;
    this.options.setSearchTerm(text);
    this.skipUpdatingNavBar = false;
  }

  onSearchCancel = () => {
    this.skipUpdatingNavBar = true;
    this.options.setSearchTerm(null);
    this.skipUpdatingNavBar = false;
  }

  render() {
    if(this.state.lockContent) {
      return <AuthModal />;
    }

    var result = ModelManager.get().getNotes(this.options);
    var notes = result.notes;
    var tags = this.selectedTags = result.tags;

    var syncStatus = Sync.get().syncStatus;

    return (
      <View style={GlobalStyles.styles().container}>
        {notes &&
          <NoteList
            onRefresh={this._onRefresh.bind(this)}
            onPressItem={this._onPressItem}
            refreshing={this.state.refreshing}
            onSearchChange={this.onSearchTextChange}
            onSearchCancel={this.onSearchCancel}
            notes={notes}
            sortType={this.options.sortBy}
            decrypting={this.state.decrypting}
            loading={this.state.loading}
            selectedTags={tags}
          />
        }

        {this.state.showSyncBar &&
          <View style={GlobalStyles.styles().syncBar}>
            <Text style={GlobalStyles.styles().syncBarText}>{this.state.syncBarText}</Text>
          </View>
        }
      </View>
    );
  }
}
