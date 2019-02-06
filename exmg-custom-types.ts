// it just create better type definition than lit-element type PropertyValues
// now editor should show what kind of field names are allowed
export type GenericPropertyValues<T extends PropertyKey, V = unknown> = Map<T, V>;

export type ToolBarOption =
  'undo' |
  'redo' |
  '|' |
  'header' |
  'strong' |
  'italic' |
  'strikethrough' |
  'quote' |
  'hr' |
  'table' |
  'code' |
  'unordered-list' |
  'ordered-list' |
  'fullscreen' |
  'split-view';

export interface EmptyToolBartConfigItem {}

export interface ToolBarConfigItem extends EmptyToolBartConfigItem {
  name: ToolBarOption;
  icon: string;
  action: Function;
  className: string;
  title: string;
}

export const isToolBartConfigItem = (item: EmptyToolBartConfigItem): item is ToolBarConfigItem => item.hasOwnProperty('name');
