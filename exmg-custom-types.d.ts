export declare type GenericPropertyValues<T extends PropertyKey, V = unknown> = Map<T, V>;
export declare type ToolBarOption = 'undo' | 'redo' | '|' | 'header' | 'strong' | 'italic' | 'strikethrough' | 'quote' | 'hr' | 'table' | 'code' | 'unordered-list' | 'ordered-list' | 'fullscreen' | 'split-view';
export interface EmptyToolBartConfigItem {
}
export interface ToolBarConfigItem extends EmptyToolBartConfigItem {
    name: ToolBarOption;
    icon: string;
    action: Function;
    className: string;
    title: string;
}
export declare const isToolBartConfigItem: (item: EmptyToolBartConfigItem) => item is ToolBarConfigItem;
