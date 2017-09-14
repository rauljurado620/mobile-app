var _ = require('lodash')

import { StyleSheet, StatusBar, Alert, Platform } from 'react-native';
import App from "./app"
import ModelManager from "./lib/modelManager"
import Server from "./lib/server"
import Sync from "./lib/sync"
import Storage from "./lib/storage"
import Auth from "./lib/auth"
import Theme from "./models/app/theme"
import KeysManager from './lib/keysManager'

export default class GlobalStyles {

  static instance = null;

  static get() {
    if (this.instance == null) {
      this.instance = new GlobalStyles();
    }

    return this.instance;
  }

  constructor() {
    this.loadDefaults();

    KeysManager.get().registerAccountRelatedStorageKeys(["active-theme-id"]);

    ModelManager.getInstance().addItemSyncObserver("themes", "SN|Theme", function(items){
      if(!this.activeThemeId) {
        Storage.getItem("active-theme-id").then(function(themeId){
          this.activeThemeId = themeId;
          if(themeId) {
            this.activateTheme(_.find(this.themes(), {uuid: themeId}));
          } else {
            this.systemTheme().active = true;
          }
        }.bind(this));
      }

    }.bind(this));

    // setTimeout(function () {
    //   StatusBar.setBarStyle("dark-content", true);
    // }, 1000);
  }

  static styles() {
    return this.get().styles.rules;
  }

  static constants() {
    return this.get().styles.constants;
  }

  systemTheme() {
    if(this._systemTheme) {
      return this._systemTheme;
    }
    var constants = this.defaultConstants();
    this._systemTheme = new Theme({
      name: "Default",
      default: true,
      uuid: 0,
      mobileRules: {
        name: "Default",
        rules: this.defaultRules(constants),
        constants: constants,
        statusBar: "dark-content"
      }
    });
    return this._systemTheme;
  }

  loadDefaults() {
    var constants = this.defaultConstants();
    this.setStyles(this.defaultRules(constants), constants, "dark-content");
  }

  themes() {
    return [this.systemTheme()].concat(ModelManager.getInstance().themes);
  }

  isThemeActive(theme) {
    return this.activateThemeId === theme.uuid;
  }

  activateTheme(theme) {
    if(this.activeTheme) {
      this.activeTheme.active = false;
    }

    var run = () => {
      var constants = _.merge(this.defaultConstants(), theme.mobileRules.constants);
      var rules = _.merge(this.defaultRules(constants), theme.mobileRules.rules);
      this.setStyles(rules, constants, theme.mobileRules.statusBar);

      this.activeTheme = theme;
      theme.active = true;
      if(theme.default) {
        Storage.removeItem("active-theme-id");
      } else {
        Storage.setItem("active-theme-id", theme.uuid);
      }

      App.get().reload();
    }

    if(!theme.mobileRules) {
      this.downloadTheme(theme, function(){
        if(theme.notAvailableOnMobile) {
          Alert.alert("Not Available", "This theme is not available on mobile.");
        } else {
          run();
        }
      });
    } else {
      run();
    }
  }

  async downloadTheme(theme, callback) {
    var url = theme.url.replace("?", ".json?");
    return Server.getInstance().getAbsolute(url, {}, function(response){
      // success
      if(response !== theme.mobileRules) {
        theme.mobileRules = response;
        theme.setDirty(true);
      }

      if(theme.notAvailableOnMobile) {
        theme.notAvailableOnMobile = false;
        theme.setDirty(true);
      }

      if(callback) {
        callback();
      }
    }, function(response) {
      // error
      if(!theme.notAvailableOnMobile) {
        theme.notAvailableOnMobile = true;
        theme.setDirty(true);
      }
      if(callback) {
        callback();
      }

      console.log("Theme download error", response);
    })
  }

  downloadThemeAndReload(theme) {
    this.downloadTheme(theme, function(){
      Sync.getInstance().sync(function(){
        this.activateTheme(theme);
      }.bind(this));
    }.bind(this))
  }

  setStyles(rules, constants, statusBar) {
    this.constants = constants;
    this.styles = {
      rules: StyleSheet.create(rules),
      constants: constants
    }

    // On Android, a time out is required, especially during app startup
    setTimeout(function () {
      StatusBar.setBarStyle(statusBar, true);
    }, Platform.OS == "android" ? 100 : 0);
  }

  defaultConstants() {
    return {
        mainBackgroundColor: "white",
        mainTintColor: "#fb0206",
        plainCellBorderColor: "#efefef",
        sectionedCellHorizontalPadding: 14,
        mainDimColor: "gray",
        mainTextColor: "black",
        selectedBackgroundColor: "#efefef",
        paddingLeft: 14,
        composeBorderColor: "#F5F5F5",
        mainTextFontSize: 16,
        mainHeaderFontSize: 16,
      }
  }

  defaultRules(constants) {
    return {
      container: {
        backgroundColor: constants.mainBackgroundColor,
        height: "100%",
      },

      flexContainer: {
        flex: 1,
        flexDirection: 'row',
      },

      uiText: {
        color: constants.mainTextColor,
        fontSize: constants.mainTextFontSize,
      },

      view: {
        backgroundColor: constants.mainBackgroundColor,
      },

      tableSection: {
        marginTop: 10,
        marginBottom: 10,
        backgroundColor: constants.mainBackgroundColor
      },

      sectionHeader: {
        color: "gray",
        fontSize: constants.mainTextFontSize - 4,
        paddingLeft: constants.paddingLeft,
        paddingBottom: 10,
        paddingTop: 10
      },

      sectionedTableCell: {
        borderBottomColor: constants.plainCellBorderColor,
        borderBottomWidth: 1,
        paddingLeft: constants.paddingLeft,
        paddingTop: 13,
        paddingBottom: 12,
        backgroundColor: constants.mainBackgroundColor,
        flex: 1
      },

      textInputCell: {
        // paddingTop: 0
        maxHeight: 50
      },

      sectionedTableCellTextInput: {
        fontSize: constants.mainTextFontSize,
        padding: 0,
        color: constants.mainTextColor
        // height: "100%",
      },

      sectionedTableCellFirst: {
        borderTopColor: constants.plainCellBorderColor,
        borderTopWidth: 1,
      },

      sectionedAccessoryTableCell: {
        paddingLeft: constants.paddingLeft,
        paddingRight: constants.paddingLeft,
        backgroundColor: constants.mainBackgroundColor
      },

      sectionedAccessoryTableCellLabel: {
        paddingTop: 12,
        fontSize: constants.mainTextFontSize,
        color: constants.mainTextColor
      },

      buttonCell: {
        paddingLeft: 0,
        paddingTop: 0,
        minHeight: 45,
        flexGrow: 0,
        backgroundColor: constants.mainBackgroundColor,
      },

      buttonCellButton: {
        textAlign: "center",
        color: constants.mainTintColor,
        fontSize: constants.mainTextFontSize - 1,
        height: "100%",
        paddingTop: 13
      },

      buttonCellButtonLeft: {
        textAlign: "left",
        paddingLeft: constants.paddingLeft
      },

      bold: {
        fontWeight: "bold"
      },
    }
  }

}
