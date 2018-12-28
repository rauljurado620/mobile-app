import React, { Component } from 'react';
import { StyleSheet, View, Text, TouchableWithoutFeedback } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import StyleKit from "../style/StyleKit"
import ActionSheet from 'react-native-actionsheet'
import ItemActionManager from '../lib/itemActionManager'

export default class NoteCell extends React.PureComponent {


  constructor(props) {
    super(props);
    this.state = {selected: false, options: props.options || {}};
    let Padding = 14;

    this.styles = StyleSheet.create({

      noteCell: {
        padding: Padding,
        paddingRight: Padding * 2,
        borderBottomColor: StyleKit.variable("stylekitBorderColor"),
        borderBottomWidth: 1,
        backgroundColor: StyleKit.variable("stylekitBackgroundColor"),
      },

      noteCellSelected: {
        backgroundColor: StyleKit.variable("stylekitInfoColor"),
      },

      noteTags: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 5,
      },

      pinnedView: {
        flex: 1,
        flexDirection: 'row',
        marginBottom: 5,
      },

      pinnedText: {
        color: StyleKit.variable("stylekitInfoColor"),
        marginLeft: 8,
        fontWeight: "bold",
        fontSize: 12
      },

      pinnedTextSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor"),
      },

      noteTag: {
        marginRight: 2,
        fontSize: 12,
        color: StyleKit.variable("stylekitForegroundColor"),
        opacity: 0.5,
      },

      noteTagSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor"),
      },

      noteTitle: {
        fontWeight: "bold",
        fontSize: StyleKit.constants().mainHeaderFontSize,
        color: StyleKit.variable("stylekitForegroundColor")
      },

      noteTitleSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor")
      },

      noteText: {
        fontSize: 15,
        // fontSize: StyleKit.constants().mainTextFontSize,
        marginTop: 4,
        color: StyleKit.variable("stylekitForegroundColor"),
        opacity: 0.8,
        lineHeight: 21
      },

      noteTextSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor")
      },

      noteDate: {
        marginTop: 5,
        fontSize: 12,
        color: StyleKit.variable("stylekitForegroundColor"),
        opacity: 0.5
      },

      noteDateSelected: {
        color: StyleKit.variable("stylekitInfoContrastColor"),
        opacity: 0.8
      },

      deleting: {
        color: StyleKit.variable("stylekitInfoColor"),
        marginBottom: 5,
      }
    });
  }

  componentWillReceiveProps(props) {
    this.setState({options: props.options || {}});
  }

  _onPress = () => {
    this.setState({selected: true});
    this.props.onPressItem(this.props.item);
    this.setState({selected: false});
  };

  _onPressIn = () => {
    this.setState({selected: true});
  };

  _onPressOut = () => {
    this.setState({selected: false});
  };

  noteCellStyle = () => {
    if(this.state.selected) {
      return [styles.noteCell, styles.noteCellSelected];
    } else {
      return styles.noteCell;
    }
  }

  aggregateStyles(base, addition, condition) {
    if(condition) {
      return [base, addition];
    } else {
      return base;
    }
  }

  static ActionSheetCancelIndex = 0;
  static ActionSheetDestructiveIndex = 4;

  actionSheetActions() {
    var pinAction = this.props.item.pinned ? "Unpin" : "Pin";
    let pinEvent = pinAction == "Pin" ? ItemActionManager.PinEvent : ItemActionManager.UnpinEvent;

    var archiveOption = this.props.item.archived ? "Unarchive" : "Archive";
    let archiveEvent = archiveOption == "Archive" ? ItemActionManager.ArchiveEvent : ItemActionManager.UnarchiveEvent;

    return [
      ['Cancel', ""],
      [pinAction, pinEvent],
      [archiveOption, archiveEvent],
      ['Share', ItemActionManager.ShareEvent],
      ['Delete', ItemActionManager.DeleteEvent]
    ];
  }

  showActionSheet = () => {
    this.actionSheet.show();
  }

  handleActionSheetPress = (index) => {
    if(index == 0) {
      return;
    }

    ItemActionManager.handleEvent(this.actionSheetActions()[index][1], this.props.item, () => {
      this.forceUpdate();
    }, () => {
      // afterConfirmCallback
      // We want to show "Deleting.." on top of note cell after the user confirms the dialogue
      this.forceUpdate();
    });
  }

  render() {
    var note = this.props.item;
    return (
       <TouchableWithoutFeedback onPress={this._onPress} onPressIn={this._onPressIn} onPressOut={this._onPressOut} onLongPress={this.showActionSheet}>
          <View style={this.aggregateStyles(this.styles.noteCell, this.styles.noteCellSelected, this.state.selected)} onPress={this._onPress}>

            {note.deleted &&
              <Text style={this.styles.deleting}>Deleting...</Text>
            }

            {note.conflict_of &&
              <Text style={this.styles.deleting}>Conflicted Copy</Text>
            }

            {note.pinned &&
              <View style={this.styles.pinnedView}>
                <Icon name={"ios-bookmark"} size={14} color={this.state.selected ? StyleKit.variable("stylekitInfoContrastColor") : StyleKit.variable("stylekitInfoColor")} />
                <Text style={this.aggregateStyles(this.styles.pinnedText, this.styles.pinnedTextSelected, this.state.selected)}>Pinned</Text>
              </View>
            }

            {this.props.renderTags && !this.state.options.hideTags && note.tags.length > 0 &&
              <View style={this.styles.noteTags}>
                <Text numberOfLines={1} style={this.aggregateStyles(this.styles.noteTag, this.styles.noteTagSelected, this.state.selected)}>
                {this.props.tagsString}
                </Text>
              </View>
            }

            {note.errorDecrypting &&
              <View>
                <Text style={[this.styles.noteTitle, this.styles.deleting]}>
                  {"Password Required."}
                </Text>
                <Text numberOfLines={2} style={this.aggregateStyles(this.styles.noteText, this.styles.noteTextSelected, this.state.selected)}>
                  {"Please sign in to restore your decryption keys and notes."}
                </Text>
              </View>
            }

            {note.safeTitle().length > 0 &&
              <Text style={this.aggregateStyles(this.styles.noteTitle, this.styles.noteTitleSelected, this.state.selected)}>
                {note.title}
              </Text>
            }

            {(note.content.preview_plain != null && !this.state.options.hidePreviews) &&
              <Text numberOfLines={2} style={this.aggregateStyles(this.styles.noteText, this.styles.noteTextSelected, this.state.selected)}>
                {note.content.preview_plain}
              </Text>
            }

            {(!note.content.preview_plain && !this.state.options.hidePreviews && note.safeText().length > 0) &&
              <Text numberOfLines={2} style={this.aggregateStyles(this.styles.noteText, this.styles.noteTextSelected, this.state.selected)}>
                {note.text}
              </Text>
            }

            {!this.state.options.hideDates &&
              <Text
                numberOfLines={1}
                style={this.aggregateStyles(this.styles.noteDate, this.styles.noteDateSelected, this.state.selected)}>
                {this.props.sortType == "client_updated_at" ? "Modified " + note.updatedAtString() : note.createdAtString()}
              </Text>
            }

            <ActionSheet
              ref={o => this.actionSheet = o}
              title={note.safeTitle()}
              options={this.actionSheetActions().map((action) => {return action[0]})}
              cancelButtonIndex={NoteCell.ActionSheetCancelIndex}
              destructiveButtonIndex={NoteCell.ActionSheetDestructiveIndex}
              onPress={this.handleActionSheetPress}
              {...StyleKit.actionSheetStyles()}
            />
        </View>
      </TouchableWithoutFeedback>
    )
  }
}
