import React from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Search from 'react-native-search-box';
import ThemedComponent from '@Root/components2/ThemedComponent';
import NoteCell from '@Root/screens2/Notes/NoteCell';
import OfflineBanner from '@Screens/Notes/OfflineBanner';
import { Platform } from 'snjs';

type Props = {
  onSearchChange: (text: string) => void;
  onSearchCancel: () => void;
  onPressItem: (item: any) => void;
  selectedTags: any[];
  selectedNoteId: string | null;
  handleAction: (item: any, key: EventType, callback: () => void) => void;
  sortType: string;
  options: any;
  decrypting: boolean;
  loading: boolean;
  hasRefreshControl: boolean;
  notes: any[];
  refreshing: boolean;
  onRefresh: () => void;
};

export default class NoteList extends ThemedComponent<Props> {
  styles!: Record<string, ViewStyle | TextStyle>;
  renderHeader = () => {
    const isOffline = Auth.get().offline();

    return (
      <View
        style={{
          paddingLeft: 5,
          paddingRight: 5,
          paddingTop: 5,
          backgroundColor: this.context?.getThemeService().variables
            .stylekitBackgroundColor,
        }}
      >
        <Search
          onChangeText={this.props.onSearchChange}
          onCancel={this.props.onSearchCancel}
          onDelete={this.props.onSearchCancel}
          blurOnSubmit={true}
          backgroundColor={
            this.context?.getThemeService().variables.stylekitBackgroundColor
          }
          titleCancelColor={
            this.context?.getThemeService().variables.stylekitInfoColor
          }
          keyboardDismissMode={'interactive'}
          keyboardAppearance={this.context
            ?.getThemeService()
            .keyboardColorForActiveTheme()}
          inputBorderRadius={4}
          inputStyle={{
            backgroundColor: this.context?.getThemeService().variables
              .stylekitContrastBackgroundColor,
            color: this.context?.getThemeService().variables
              .stylekitForegroundColor,
            height: 30,
          }}
        />

        {isOffline && <OfflineBanner />}
      </View>
    );
  };

  /**
   * @private
   * Must pass title, text, and tags as props so that it re-renders when either
   * of those change.
   */
  _renderItem = ({ item }: any) => {
    /**
     * On Android, only one tag is selected at a time. If it is selected, we
     * don't need to display the tags string above the note cell.
     */
    const selectedTags = this.props.selectedTags || [];
    const renderTags =
      this.context?.platform === Platform.Ios ||
      selectedTags.length === 0 ||
      !item.tags.includes(selectedTags[0]);

    return (
      <NoteCell
        item={item}
        onPressItem={this.props.onPressItem}
        // @ts-ignore TODO: not used props for extra data
        title={item.title}
        text={item.text}
        tags={item.tags}
        tagsString={item.tagsString()}
        sortType={this.props.sortType}
        renderTags={renderTags}
        options={this.props.options}
        highlighted={item.uuid === this.props.selectedNoteId}
        handleAction={this.props.handleAction}
        // @ts-ignore TODO: not used props for extra data
        pinned={item.pinned /* extraData */}
        deleted={item.deleted /* extraData */}
        archived={item.archived /* extraData */}
        locked={item.locked /* extraData */}
        protected={item.content.protected /* extraData */}
        hidePreview={item.content.hidePreview /* extraData */}
        conflictOf={item.content.conflict_of /* extraData */}
      />
    );
  };

  render() {
    let placeholderText = '';
    if (this.props.decrypting) {
      placeholderText = 'Decrypting notes...';
    } else if (this.props.loading) {
      placeholderText = 'Loading notes...';
    } else if (this.props.notes.length === 0) {
      placeholderText = 'No notes.';
    }

    return (
      <View
        style={{
          backgroundColor: this.context?.getThemeService().variables
            .stylekitBackgroundColor,
        }}
      >
        {placeholderText.length > 0 && (
          <View style={this.styles.loadingTextContainer}>
            <Text style={this.styles.loadingText}>{placeholderText}</Text>
          </View>
        )}

        <FlatList
          style={{ height: '100%' }}
          initialNumToRender={6}
          windowSize={6}
          maxToRenderPerBatch={6}
          keyboardDismissMode={'interactive'}
          keyboardShouldPersistTaps={'always'}
          refreshControl={
            !this.props.hasRefreshControl ? undefined : (
              <RefreshControl
                refreshing={this.props.refreshing}
                onRefresh={this.props.onRefresh}
              />
            )
          }
          data={this.props.notes}
          // options={this.props.options} no options prop
          renderItem={this._renderItem}
          ListHeaderComponent={this.renderHeader}
        />
      </View>
    );
  }

  loadStyles() {
    this.styles = StyleSheet.create({
      container: {
        flex: 1,
      },

      loadingTextContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
        position: 'absolute',
        height: '100%',
        width: '100%',
      },

      loadingText: {
        position: 'absolute',
        opacity: 0.5,
        color: this.context?.getThemeService().variables
          .stylekitForegroundColor,
      },
    });
  }
}
