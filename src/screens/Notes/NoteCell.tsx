import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableWithoutFeedback,
  TextStyle,
  ViewStyle,
} from 'react-native';
import ThemedPureComponent from '@Components/ThemedPureComponent';
import ActionSheetWrapper from '@Style/ActionSheetWrapper';
import { hexToRGBA } from '@Style/utils';

type Props = {
  item: any;
  options: OptionsState;
  highlighted?: boolean;
  onPressItem: (item: any) => void;
  handleAction: (item: any, key: EventType, callback: () => void) => void;
  renderTags: boolean;
  sortType: string;
  tagsString: string;
};

type State = {
  selected: boolean;
  options: OptionsState;
  actionSheet: JSX.Element | null;
};

export default class NoteCell extends ThemedPureComponent<Props, State> {
  styles!: Record<string, ViewStyle | TextStyle>;
  selectionTimeout?: number;
  constructor(props: Readonly<Props>) {
    super(props);
    this.state = {
      selected: false,
      options: props.options || {},
      actionSheet: null,
    };
  }

  static getDerivedStateFromProps(props: Props, state: State) {
    if (props.options !== state.options) {
      return { options: props.options };
    }

    return null;
  }

  _onPress = () => {
    this.setState({ selected: true });
    this.props.onPressItem(this.props.item);
    this.setState({ selected: false });
  };

  _onPressIn = () => {
    // Debounce
    const delay = 25;
    this.selectionTimeout = setTimeout(() => {
      this.setState({ selected: true });
    }, delay);
  };

  _onPressOut = () => {
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
    }
    this.setState({ selected: false });
  };

  aggregateStyles(base: ViewStyle, addition: ViewStyle, condition: boolean) {
    if (condition) {
      return [base, addition];
    } else {
      return base;
    }
  }

  showActionSheet = () => {
    if (this.props.item.errorDecrypting) {
      return;
    }

    let callbackForAction = (action: any) => {
      this.props.handleAction(this.props.item, action.key, () => {
        this.forceUpdate();
      });
    };

    const pinLabel = this.props.item.pinned ? 'Unpin' : 'Pin';
    const pinEvent =
      pinLabel === 'Pin'
        ? ItemActionManager.PinEvent
        : ItemActionManager.UnpinEvent;

    const archiveLabel = this.props.item.archived ? 'Unarchive' : 'Archive';
    const archiveEvent =
      archiveLabel === 'Archive'
        ? ItemActionManager.ArchiveEvent
        : ItemActionManager.UnarchiveEvent;

    const lockLabel = this.props.item.locked ? 'Unlock' : 'Lock';
    const lockEvent =
      lockLabel === 'Lock'
        ? ItemActionManager.LockEvent
        : ItemActionManager.UnlockEvent;

    const protectLabel = this.props.item.content.protected
      ? 'Unprotect'
      : 'Protect';
    const protectEvent =
      protectLabel === 'Protect'
        ? ItemActionManager.ProtectEvent
        : ItemActionManager.UnprotectEvent;

    let sheet;
    if (this.props.item.content.protected) {
      sheet = new ActionSheetWrapper({
        title: 'Note Protected',
        options: [],
        onCancel: () => {
          this.setState({ actionSheet: null });
        },
      });
    } else {
      const options = [
        ActionSheetWrapper.BuildOption({
          text: pinLabel,
          key: pinEvent,
          callback: callbackForAction,
        }),
        ActionSheetWrapper.BuildOption({
          text: archiveLabel,
          key: archiveEvent,
          callback: callbackForAction,
        }),
        ActionSheetWrapper.BuildOption({
          text: lockLabel,
          key: lockEvent,
          callback: callbackForAction,
        }),
        ActionSheetWrapper.BuildOption({
          text: protectLabel,
          key: protectEvent,
          callback: callbackForAction,
        }),
        ActionSheetWrapper.BuildOption({
          text: 'Share',
          key: ItemActionManager.ShareEvent,
          callback: callbackForAction,
        }),
      ];

      if (!this.props.item.content.trashed) {
        options.push(
          ActionSheetWrapper.BuildOption({
            text: 'Move to Trash',
            key: ItemActionManager.TrashEvent,
            destructive: true,
            callback: callbackForAction,
          })
        );
      } else {
        options.push(
          ActionSheetWrapper.BuildOption({
            text: 'Restore Note',
            key: ItemActionManager.RestoreEvent,
            destructive: false,
            callback: callbackForAction,
          })
        );
        options.push(
          ActionSheetWrapper.BuildOption({
            text: 'Delete Permanently',
            key: ItemActionManager.DeleteEvent,
            destructive: true,
            callback: callbackForAction,
          })
        );
      }

      sheet = new ActionSheetWrapper({
        title: this.props.item.safeTitle(),
        options: options,
        onCancel: () => {
          this.setState({ actionSheet: null });
        },
      });
    }

    this.setState({ actionSheet: sheet.actionSheetElement() });
    sheet.show();
  };

  getFlags(note: {
    pinned: boolean;
    archived: boolean;
    content: { protected: boolean; trashed: boolean; conflict_of: any };
    locked: boolean;
    errorDecrypting: any;
    deleted: boolean;
  }) {
    let flags = [];
    const variables = this.context!.getThemeService().variables;

    if (note.pinned) {
      flags.push({
        text: 'Pinned',
        color: variables.stylekitInfoColor,
      });
    }

    if (note.archived) {
      flags.push({
        text: 'Archived',
        color: variables.stylekitWarningColor,
      });
    }

    if (note.content.protected) {
      flags.push({
        text: 'Protected',
        color: variables.stylekitSuccessColor,
      });
    }

    if (note.locked) {
      flags.push({
        text: 'Locked',
        color: variables.stylekitNeutralColor,
      });
    }

    if (note.content.trashed) {
      flags.push({
        text: 'Deleted',
        color: variables.stylekitDangerColor,
      });
    }

    if (note.errorDecrypting) {
      flags.push({
        text: 'Missing Keys',
        color: variables.stylekitDangerColor,
      });
    }

    if (note.content.conflict_of) {
      flags.push({
        text: 'Conflicted Copy',
        color: variables.stylekitDangerColor,
      });
    }

    if (note.deleted) {
      flags.push({
        text: 'Deletion Pending Sync',
        color: variables.stylekitDangerColor,
      });
    }

    return flags;
  }

  flagElement = (flag: { color: any; text: any }) => {
    let bgColor = flag.color;
    const variables = this.context!.getThemeService().variables;
    let textColor = variables.stylekitInfoContrastColor;
    if (this.state.selected || this.props.highlighted) {
      bgColor = variables.stylekitInfoContrastColor;
      textColor = variables.stylekitInfoColor;
    }
    const styles = {
      background: {
        backgroundColor: bgColor,
        padding: 4,
        paddingLeft: 6,
        paddingRight: 6,
        borderRadius: 3,
        marginRight: 4,
      },
      text: {
        color: textColor,
        fontSize: 10,
        fontWeight: 'bold' as 'bold',
      },
    };
    return (
      <View key={flag.text} style={styles.background}>
        <Text style={styles.text}>{flag.text}</Text>
      </View>
    );
  };

  render() {
    const note = this.props.item;
    const showPreview =
      !this.state.options.hidePreviews &&
      !note.content.protected &&
      !note.content.hidePreview;
    const flags = this.getFlags(note);
    const showTagsString =
      this.props.renderTags &&
      !this.state.options.hideTags &&
      note.tags.length > 0 &&
      !note.content.protected;

    const highlight = Boolean(this.state.selected || this.props.highlighted);

    return (
      <TouchableWithoutFeedback
        onPress={this._onPress}
        onPressIn={this._onPressIn}
        onPressOut={this._onPressOut}
        onLongPress={this.showActionSheet}
      >
        <View
          style={this.aggregateStyles(
            this.styles.noteCell,
            this.styles.noteCellSelected,
            highlight
          )}
          // TODO: onPreess does not exist on view
          // onPress={this._onPress}
        >
          {note.deleted && (
            <Text style={this.styles.deleting}>Deleting...</Text>
          )}

          {flags.length > 0 && (
            <View style={this.styles.flagsContainer}>
              {flags.map(flag => this.flagElement(flag))}
            </View>
          )}

          {note.errorDecrypting && (
            <View>
              <Text
                numberOfLines={2}
                style={this.aggregateStyles(
                  this.styles.noteText,
                  this.styles.noteTextSelected,
                  highlight
                )}
              >
                {'Please sign in to restore your decryption keys and notes.'}
              </Text>
            </View>
          )}

          {note.safeTitle().length > 0 && (
            <Text
              style={this.aggregateStyles(
                this.styles.noteTitle,
                this.styles.noteTitleSelected,
                highlight
              )}
            >
              {note.title}
            </Text>
          )}

          {note.content.preview_plain != null && showPreview && (
            <Text
              numberOfLines={2}
              style={this.aggregateStyles(
                this.styles.noteText,
                this.styles.noteTextSelected,
                highlight
              )}
            >
              {note.content.preview_plain}
            </Text>
          )}

          {!note.content.preview_plain &&
            showPreview &&
            note.safeText().length > 0 && (
              <Text
                numberOfLines={2}
                style={this.aggregateStyles(
                  this.styles.noteText,
                  this.styles.noteTextSelected,
                  highlight
                )}
              >
                {note.text}
              </Text>
            )}

          {!this.state.options.hideDates && (
            <Text
              numberOfLines={1}
              style={this.aggregateStyles(
                this.styles.noteDate,
                this.styles.noteDateSelected,
                highlight
              )}
            >
              {this.props.sortType === 'client_updated_at'
                ? 'Modified ' + note.updatedAtString()
                : note.createdAtString()}
            </Text>
          )}

          {showTagsString && (
            <View style={this.styles.noteTagsContainer}>
              <Text
                numberOfLines={1}
                style={this.aggregateStyles(
                  this.styles.noteTag,
                  this.styles.noteTagSelected,
                  highlight
                )}
              >
                {this.props.tagsString}
              </Text>
            </View>
          )}

          {this.state.actionSheet && this.state.actionSheet}
        </View>
      </TouchableWithoutFeedback>
    );
  }

  loadStyles() {
    let padding = 14;
    // @ts-ignore ignore null return from hexToRGBA
    const variables = this.context!.getThemeService().variables;
    this.styles = StyleSheet.create({
      noteCell: {
        padding: padding,
        paddingRight: padding * 2,
        borderBottomColor: hexToRGBA(variables.stylekitBorderColor, 0.75),
        borderBottomWidth: 1,
        backgroundColor: variables.stylekitBackgroundColor,
      },

      noteCellSelected: {
        backgroundColor: variables.stylekitInfoColor,
      },

      noteTagsContainer: {
        flex: 1,
        flexDirection: 'row',
        marginTop: 7,
      },

      pinnedView: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 5,
      },

      flagsContainer: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 8,
      },

      noteTag: {
        marginRight: 2,
        fontSize: 12,
        color: variables.stylekitForegroundColor,
        opacity: 0.5,
      },

      noteTagSelected: {
        color: variables.stylekitInfoContrastColor,
        opacity: 0.8,
      },

      noteTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: variables.stylekitForegroundColor,
      },

      noteTitleSelected: {
        color: variables.stylekitInfoContrastColor,
      },

      noteText: {
        fontSize: 15,
        marginTop: 4,
        color: variables.stylekitForegroundColor,
        opacity: 0.8,
        lineHeight: 21,
      },

      noteTextSelected: {
        color: variables.stylekitInfoContrastColor,
      },

      noteDate: {
        marginTop: 5,
        fontSize: 12,
        color: variables.stylekitForegroundColor,
        opacity: 0.5,
      },

      noteDateSelected: {
        color: variables.stylekitInfoContrastColor,
        opacity: 0.8,
      },

      deleting: {
        color: variables.stylekitInfoColor,
        marginBottom: 5,
      },
    });
  }
}
