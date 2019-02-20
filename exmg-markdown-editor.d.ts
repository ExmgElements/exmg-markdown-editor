/// <reference types="codemirror" />
import { LitElement } from 'lit-element';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/marked-element/marked-element';
import './exmg-markdown-editor-icons';
import { GenericPropertyValues, ToolBarOption } from './exmg-custom-types';
import Editor = CodeMirror.Editor;
declare type PrivateProps = 'toolbarButtonsConfig';
declare type Props = Exclude<keyof EditorElement, number | Symbol> | PrivateProps;
declare type ChangedProps = GenericPropertyValues<Props>;
interface MarkdownElement extends HTMLElement {
    markdown?: string;
}
/**
* Markdown WYSIWYG editor element.
* This editor element is a wrapper element for the markdown-element which will enable editing
* the markdown data. See [marked-element](https://www.webcomponents.org/element/PolymerElements/marked-element/)
* for more details on how to use this element.
*
* ```
* <exmg-markdown-editor markdown="{{markdown}}">
*   <marked-element markdown="{{markdown}}">
*     <div slot="markdown-html"></div>
*     <script type="text/markdown"\>
*     # Header
*     ...
*     </script\>
*   </marked-element>
* </exmg-markdown-editor>
* ```
*
* ## Custom Toolbar
* Add attribute toolbar-buttons to adjust the toolbar buttons. The array values should match
* the _toolbarButtons item name values.
*
* ```html
* <exmg-markdown-editor toolbar-buttons='["strong","italic","strikethrough","|","quote","hr","table"]'>
*  ...
* </exmg-markdown-editor>
* ```
*
* ### Styling
*
* The preview panel markdown output can be styled from outside th element. See the demo/styling.html example
* on how to do this. In this demo the github-markdown-css project is used for styling the html output.
*
* `<exmg-markdown-editor>` provides the following custom properties and mixins
*  for styling:
*
*  Custom property | Description | Default
*  ----------------|-------------|----------
*  `--exmg-markdown-editor` | editor mixin | `{}`
*  `--exmg-markdown-editor-border` | Border Color | `#ddd`
*  `--exmg-markdown-editor-background-color` | Editor Background Color | `white`
*  `--exmg-markdown-editor-fullscreen-top-offset` | Top offset in fullscreen mode | `0px`
*  `--exmg-markdown-editor-toolbar` | editor mixin | `{}`
*  `--exmg-markdown-editor-toolbar-background` | Toolbar background color | `#fafafa`
*  `--exmg-markdown-editor-toolbar-color` | Toolbar text color | `87% black`
*  `--exmg-markdown-editor-toolbar-color-disabled` | Toolbar text color disabled | `54% black`
*  `--exmg-markdown-editor-preview` | HTML Preview mixin | `{}`
*  `--exmg-markdown-editor-preview-background` | Preview background color | `white`
*  `--exmg-markdown-editor-toolbar-button-icon` | Toolbar button icon mixin | `{}`
*  `--exmg-markdown-editor-toolbar-button-hover` | Toolbar button mixin | `{}`
*  `--exmg-markdown-editor-toolbar-button-background-hover` | Toolbar icon border color | `#fafafa`
*  `--exmg-markdown-editor-toolbar-seperator-color` | Toolbar seperator color | `#ddd`
*  `--exmg-markdown-editor-code` | CodeMirror root mixin | `{}`
*  `--exmg-markdown-editor-code-hover` | Editor code part hover background color | `white`
*  `--exmg-markdown-editor-code-focused` | CodeMirror editor focused mixin | `{}`
*
*  # Events:
*  - value-change - where detail is current markdown value
*  - exmg-markdown-editor-fullscreen where detail is boolean with current fullscreen state
*
* @customElement
* @polymer
* @litElement
* @group Exmg Core Elements
* @element exmg-markdown-editor
* @demo demo/index.html
* @memberof Exmg
* @extends LitElement
* @summary Markdown editor element
*/
export declare class EditorElement extends LitElement {
    autoFocus: boolean;
    lineNumbers: boolean;
    indentWithTabs: boolean;
    markdown?: string;
    splitView: boolean;
    fullscreen: boolean;
    toolbarButtons: ToolBarOption[];
    name?: string;
    required: boolean;
    private invalid;
    validate(): boolean;
    private toolbarButtonsConfig;
    shortcuts: Record<string, string>;
    readonly markdownElement: MarkdownElement | null;
    editorElement?: HTMLElement;
    private codeMirrorEditor?;
    private normalizedToolBarConfig;
    private dispatchMarkdownUpdatedDebounce;
    private isElementInitialized;
    readonly value: string | undefined;
    /**
     * When ready check if markdown property is set or otherwise look for script tag
     */
    private ready;
    /**
     * Helper method that creates button array from toolbar config property
     * @param {Array} toolBarOptions
     * @return {Array}
     */
    private getToolbar;
    /**
     * Manages the undo/redo disabled state based upon the available history in code mirror
     */
    private updateDocHistory;
    /********* Observers *************/
    private observeFullscreen;
    private observeMarkdownChanged;
    /********* TOOL BAR HANDLERS *************/
    private toggleFullscreen;
    private toggleSplitView;
    setupEditor(): Editor;
    private replaceRangeLine;
    private insertAtCursor;
    private hasType;
    private processBlock;
    private processLine;
    private isSelectionInline;
    private getStates;
    private toggleHorizontalRule;
    private toggleStrikethrough;
    private toggleBold;
    private toggleItalic;
    private toggleBlockquote;
    private toggleUnorderedList;
    private toggleOrderedList;
    private toggleHeader;
    private insertTable;
    private toggleCode;
    private undo;
    private redo;
    /*****  LIT ELEMENT HOOKS ******/
    disconnectedCallback(): void;
    protected update(changedProperties: ChangedProps): void;
    protected firstUpdated(): Promise<void>;
    protected updated(changedProperties: ChangedProps): void;
    protected render(): import("lit-element").TemplateResult;
}
export {};
