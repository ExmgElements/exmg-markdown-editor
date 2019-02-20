import {LitElement, html, customElement, query, property} from 'lit-element';
import {repeat} from 'lit-html/directives/repeat';

import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import '@polymer/marked-element/marked-element';

import {afterNextRender} from '@polymer/polymer/lib/utils/render-status.js';

import './exmg-markdown-editor-icons';
import {codeMirrorStylesText} from './exmg-markdown-codemirror-styles';
import {
  GenericPropertyValues, ToolBarOption, ToolBarConfigItem,
  EmptyToolBartConfigItem, isToolBartConfigItem
} from './exmg-custom-types';

import Editor = CodeMirror.Editor;

type PrivateProps = 'toolbarButtonsConfig';

type Props = Exclude<keyof EditorElement, number | Symbol> | PrivateProps;

type ChangedProps = GenericPropertyValues<Props>;

type Position = {
  ch: number;
  line: number;
  sticky?: string;
};

interface MarkdownElement extends HTMLElement {
  markdown?: string;
}

const isMac = /Mac/.test(navigator.platform);
const convertShortcut = (name: string): string => {
  return isMac ? name : name.replace('Cmd', 'Ctrl');
};
const insertBlocks = {
  hr: '---',
  link: '[](#url#)',
  image: '![](#url#)',
  table: '| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |',
};

const debounce  = (time: number) => {
  let timer: number;

  return (cb?: Function): void => {
    clearTimeout(timer);
    if (cb) {
      timer = window.setTimeout(cb, time);
    }
  };
};

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
@customElement('exmg-markdown-editor')
export class EditorElement extends LitElement {
  @property({type: Boolean, attribute: 'auto-focus'})
  autoFocus: boolean = false;

  @property({type: Boolean, attribute: 'line-numbers'})
  lineNumbers: boolean = false;

  @property({type: Boolean, attribute: 'indent-with-tabs'})
  indentWithTabs: boolean = true;

  @property({type: String})
  markdown? : string;

  @property({type: Boolean, reflect: true, attribute: 'split-view'})
  splitView: boolean = true;

  @property({type: Boolean, reflect: true, attribute: 'fullscreen'})
  fullscreen: boolean = false;

  @property({type: Array, attribute: 'toolbar-buttons'})
  toolbarButtons: ToolBarOption[] = [
    'undo', 'redo', '|', 'header', 'strong', 'italic', 'strikethrough',
    '|', 'quote', 'hr', 'table', 'code', '|', 'unordered-list',
    'ordered-list', '|', 'fullscreen', 'split-view',
  ];

  @property({type: String})
  public name?: string;

  @property({type: Boolean})
  public required: boolean = false;

  public validate(): boolean {
    return !this.required || !!this.markdown;
  }

  @property({type: Array})
  private toolbarButtonsConfig: ToolBarConfigItem[] = [
    {
      name: 'undo',
      icon: 'exmg-markdown-editor-icons:undo',
      action: this.undo,
      className: 'btn-undo',
      title: 'Undo',
    }, {
      name: 'redo',
      icon: 'exmg-markdown-editor-icons:redo',
      action: this.redo,
      className: 'btn-redo',
      title: 'Redo',
    }, {
      name: 'header',
      icon: 'exmg-markdown-editor-icons:text-fields',
      action: this.toggleHeader,
      className: 'btn-header',
      title: 'Header',
    }, {
      name: 'strong',
      icon: 'exmg-markdown-editor-icons:format-bold',
      action: this.toggleBold,
      className: 'btn-bold',
      title: 'Bold',
    }, {
      name: 'italic',
      icon: 'exmg-markdown-editor-icons:format-italic',
      action: this.toggleItalic,
      className: 'btn-italic',
      title: 'Italic',
    }, {
      name: 'strikethrough',
      icon: 'exmg-markdown-editor-icons:format-strikethrough',
      action: this.toggleStrikethrough,
      className: 'btn-strikethrough',
      title: 'Strikethrough',
    }, {
      name: 'quote',
      icon: 'exmg-markdown-editor-icons:format-quote',
      action: this.toggleBlockquote,
      className: 'btn-quote-left',
      title: 'Quote',
    }, {
      name: 'hr',
      icon: 'exmg-markdown-editor-icons:trending-flat',
      action: this.toggleHorizontalRule,
      className: 'btn-horizontal-rule',
      title: 'Horizontal Rule',
    }, {
      name: 'code',
      icon: 'exmg-markdown-editor-icons:code',
      action: this.toggleCode,
      className: 'btn-code',
      title: 'Code',
    }, {
      name: 'table',
      icon: 'exmg-markdown-editor-icons:grid-on',
      action: this.insertTable,
      className: 'btn-table',
      title: 'Table',
    }, {
      name: 'unordered-list',
      icon: 'exmg-markdown-editor-icons:format-list-bulleted',
      action: this.toggleUnorderedList,
      className: 'btn-list-ul',
      title: 'Generic List',
    }, {
      name: 'ordered-list',
      icon: 'exmg-markdown-editor-icons:format-list-numbered',
      action: this.toggleOrderedList,
      className: 'btn-list-ol',
      title: 'Numbered List',
    }, {
      name: 'fullscreen',
      icon: 'exmg-markdown-editor-icons:fullscreen',
      action: this.toggleFullscreen,
      className: 'btn-fullscreen',
      title: 'Fullscreen',
    }, {
      name: 'split-view',
      icon: 'exmg-markdown-editor-icons:chrome-reader-mode',
      action: this.toggleSplitView,
      className: 'btn-split-view',
      title: 'Split View',
    },
  ];

  @property({type: Object, attribute: 'shortcuts'})
  shortcuts: Record<string, string> = {
    undo: 'Cmd-Z',
    redo: 'Cmd-Y',
    strong: 'Cmd-B',
    italic: 'Cmd-I',
    quote: 'Cmd-\'',
    'unordered-list': 'Cmd-Alt-L',
    'ordered-list': 'Cmd-L',
    'split-view': 'F9',
    fullscreen: 'F11',
  };

  get markdownElement(): MarkdownElement | null {
    return this.querySelector<MarkdownElement>('marked-element');
  }

  @query('#editor')
  editorElement?: HTMLElement;

  private codeMirrorEditor?: Editor;

  private normalizedToolBarConfig: Map<ToolBarOption, ToolBarConfigItem> = new Map();

  private dispatchMarkdownUpdatedDebounce: (cb?: Function) => void = debounce(300);

  private isElementInitialized: boolean = false;

  get value() {
    return this.markdown;
  }

  /**
   * When ready check if markdown property is set or otherwise look for script tag
   */
  private ready(): void {
    this.setupEditor();

    const markedElement = this.markdownElement;
    if (!markedElement) {
      throw new Error('Missing children <marked-element>');
    }

    if (markedElement.markdown) {
      this.codeMirrorEditor!.setValue(markedElement.markdown);
      setTimeout(() => {
        this.codeMirrorEditor!.refresh();
      }, 0);
    } else {
      const onMarkedLoadend = () => {
        markedElement.removeEventListener('marked-render-complete', onMarkedLoadend);
        this.markdown = markedElement.markdown;
      };
      markedElement.addEventListener('marked-render-complete', onMarkedLoadend);
    }
  }

  /**
   * Helper method that creates button array from toolbar config property
   * @param {Array} toolBarOptions
   * @return {Array}
   */
  private getToolbar(toolBarOptions: ToolBarOption[] = []): (ToolBarConfigItem|EmptyToolBartConfigItem)[] {
    return toolBarOptions.map((optionName: ToolBarOption) => {
      if (optionName === '|') {
        return {};
      }

      return this.normalizedToolBarConfig.get(optionName) || {};
    });
  }

  /**
   * Manages the undo/redo disabled state based upon the available history in code mirror
   */
  private updateDocHistory(): void {
    if (!this.codeMirrorEditor) {
      return;
    }
    const {undo, redo} = this.codeMirrorEditor.getDoc().historySize();

    const undoEl = this.shadowRoot!.querySelector('.btn-undo');
    if (undoEl) {
      if (undo > 0) {
        undoEl.removeAttribute('disabled');
      } else {
        undoEl.setAttribute('disabled', 'disabled');
      }
    }

    const redoEl = this.shadowRoot!.querySelector('.btn-redo');
    if (redoEl) {
      if (redo > 0) {
        redoEl.removeAttribute('disabled');
      } else {
        redoEl.setAttribute('disabled', 'disabled');
      }
    }
  }

  /********* Observers *************/

  private observeFullscreen(): void {
    if (!this.codeMirrorEditor) {
      return;
    }
    this.codeMirrorEditor.setOption('fullScreen', this.fullscreen);

    if (this.isElementInitialized) {
      this.dispatchEvent(new CustomEvent(
        'exmg-markdown-editor-fullscreen',
        {detail: !!this.fullscreen, composed: true, bubbles: true}
      ));
    }
  }

  private observeMarkdownChanged(): void {
    if (this.codeMirrorEditor!.getValue() !== this.markdown) {
      this.codeMirrorEditor!.setValue(this.markdown!);
    }
    if (this.markdownElement) {
      this.markdownElement!.markdown = this.markdown;
    }
    this.updateDocHistory();
  }

  /********* TOOL BAR HANDLERS *************/

  private toggleFullscreen(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.fullscreen = !this.fullscreen;
  }

  private toggleSplitView(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.splitView = !this.splitView;
  }

  setupEditor(): Editor {
    /* initialize key map */
    const keyMaps: Record<string, Function> = {
      Tab: (codeMirror: Editor) => {
        const ranges = codeMirror.getDoc().listSelections();
        const pos = ranges[0].head;
        const eolState = codeMirror.getStateAfter(pos.line);
        const inList = eolState.list !== false;

        if (inList) {
          codeMirror.execCommand('indentMore');
          return;
        }

        if (codeMirror.getOption('indentWithTabs')) {
          codeMirror.execCommand('insertTab');
        } else {
         const spaces = Array(codeMirror.getOption('tabSize') + 1).join(' ');
          codeMirror.getDoc().replaceSelection(spaces);
        }
      },
      'Shift-Tab': (codeMirror: Editor) => {
        const ranges = codeMirror.getDoc().listSelections();
        const pos = ranges[0].head;
        const eolState = codeMirror.getStateAfter(pos.line);
        const inList = eolState.list !== false;

        if (inList) {
          codeMirror.execCommand('indentLess');
          return;
        }

        if (codeMirror.getOption('indentWithTabs')) {
          codeMirror.execCommand('insertTab');
        } else {
          const spaces = Array(codeMirror.getOption('tabSize') + 1).join(' ');
          codeMirror.getDoc().replaceSelection(spaces);
        }
      },
      Esc: (codeMirror: Editor) => {
        if (codeMirror.getOption('fullScreen')) {
          this.fullscreen = false;
        }
      },
    };

    Object.keys(this.shortcuts).forEach(shortcut => {
      const actionBtn = this.normalizedToolBarConfig.get(<ToolBarOption>shortcut);
      if (actionBtn && !!this.shortcuts[shortcut]) {
        keyMaps[convertShortcut(this.shortcuts[shortcut])] = () => actionBtn.action.bind(this)();
      }
    });

    /* initialize code mirror */
    // @ts-ignore
    const codeMirrorEditor: Editor = CodeMirror(this.editorElement, {
      mode: 'markdown',
      value: this.markdown || '',
      tabSize: 2,
      indentUnit: 2,
      indentWithTabs: this.indentWithTabs,
      lineNumbers: this.lineNumbers,
      autofocus: this.autoFocus,
      extraKeys: keyMaps,
      lineWrapping: true,
      allowDropFileTypes: ['text/plain'],
    });

    /* Update markdown property with latest changes */
    codeMirrorEditor.on('change', (editor: Editor) => {
      this.markdown = editor.getValue();
      this.dispatchMarkdownUpdatedDebounce(
        () => {
          this.dispatchEvent(new CustomEvent('value-change', {bubbles: true, composed: true, detail: editor.getValue()}));
        }
      );
    });

    afterNextRender(this, () => this.updateDocHistory());

    this.codeMirrorEditor = codeMirrorEditor;

    return codeMirrorEditor;
  }

  private replaceRangeLine(text: string, lineNumber: number): void {
    this.codeMirrorEditor!.getDoc().replaceRange(text, {line: lineNumber, ch: 0}, {line: lineNumber, ch: 99999999999999});
  }

  private insertAtCursor(text: string, selectionOffset?: number, selectionLength?: number): void {
    this.codeMirrorEditor!.getDoc().replaceSelection(text, 'start');

    const cursorStart = this.codeMirrorEditor!.getDoc().getCursor();
    cursorStart.ch += selectionOffset || 0;
    this.codeMirrorEditor!.getDoc().setSelection(
      cursorStart,
      {line: cursorStart.line, ch: cursorStart.ch + (selectionLength || text.length)}
    );
    this.codeMirrorEditor!.focus();
  }

  private hasType(states: string[], type: string): boolean {
    const mappings = [{
      key: 'code',
      value: 'comment',
    }, {
      key: 'inline-code',
      value: 'comment',
    }];

    if (states.includes(type)) {
      return true;
    }

    const result = mappings.find(m => {
      return m.key === type;
    });

    return result ? states.includes(result.value) : false;
  }

  private processBlock(type: string, newLine: boolean = false): void {
    const codeMirror = this.codeMirrorEditor!;
    const states = this.getStates();
    const blockStyles: Record<string, string> = {
      strong: '**',
      'inline-code': '`',
      code: '```',
      italic: '*',
      strikethrough: '~~',
    };

    const cursorStart = codeMirror.getDoc().getCursor('start');
    const cursorEnd = codeMirror.getDoc().getCursor('end');
    const multiLineSelection = cursorStart.line !== cursorEnd.line;
    const selectionText = codeMirror.getDoc().getSelection();
    const emptySelection = selectionText === '';

    if (this.hasType(states, type)) {
      const line = codeMirror.getDoc().getLine(cursorStart.line);
      let start = line.slice(0, cursorStart.ch);
      let end = line.slice(cursorEnd.ch);
      switch (type) {
        case 'code':
        case 'inline-code':
        case 'strong':
        case 'italic':
        case 'strikethrough':
          start = start.endsWith(blockStyles[type]) ? start.substring(0, start.length - blockStyles[type].length) : start;
          end = end.startsWith(blockStyles[type]) ? end.substring(blockStyles[type].length) : end;
          break;
      }
      this.replaceRangeLine(start + selectionText + end, cursorStart.line);
      cursorStart.ch -= blockStyles[type].length;
      cursorEnd.ch -= blockStyles[type].length;
    } else {
      const text = blockStyles[type] + (type === 'code' ? '\n' : '')
        + (emptySelection ? `${type} text` : selectionText)
        + (type === 'code' ? '\n' : '') + blockStyles[type];
      codeMirror.getDoc().replaceSelection(text);
      if (newLine) {
        cursorStart.line += 1;
        cursorEnd.line += 1;
      } else {
        cursorStart.ch += blockStyles[type].length;
        if (!multiLineSelection) {
          cursorEnd.ch += blockStyles[type].length;
        }
      }
    }

    codeMirror.getDoc().setSelection(cursorStart, cursorEnd);
    codeMirror.focus();
  }

  private processLine(type: string, symbol?: string): void {
    const codeMirror = this.codeMirrorEditor!;
    const cursorStart = codeMirror.getDoc().getCursor('start');
    const cursorEnd = codeMirror.getDoc().getCursor('end');

    let lineCount = 0;
    for (let i = cursorStart.line; i <= cursorEnd.line; i += 1) {
      const lineStart = Object.assign(Object.assign({}, cursorStart), {line: i, ch: 0, sticky: 'after'});
      const states = this.getStates(lineStart);
      let text = codeMirror.getDoc().getLine(i);
      const stateFound = states.includes(type);

      switch (type) {
        case 'header': {
          const result = /(^[\#]+)/.exec(text);
          if (result === null) {
            text = `${symbol} ${text}`;
          } else {
            text = result[0].length === 6 ? text.substring(7) : `${symbol}${text}`;
          }
          break;
        }
        case 'quote':
        case 'unordered-list':
          text = stateFound ? text.substring(2) : `${symbol} ${text}`;
          break;
        case 'ordered-list':
          text = stateFound ? text.substring(3) : `${(lineCount + 1)}. ${text}`;
          break;
      }
      this.replaceRangeLine(text, i);
      lineCount += 1;
    }

    codeMirror.getDoc().setSelection(cursorStart, cursorEnd);
    codeMirror.focus();
  }

  private isSelectionInline(): boolean {
    const codeMirror = this.codeMirrorEditor!;
    const cursorStart = codeMirror.getDoc().getCursor('start');
    const cursorEnd = codeMirror.getDoc().getCursor('end');
    const lineLength = codeMirror.getDoc().getLine(cursorStart.line).length;
    return cursorStart.line === cursorEnd.line && (cursorEnd.ch - cursorStart.ch !== lineLength);
  }

  private getStates(position?: Position): string[] {
    const codeMirror = this.codeMirrorEditor!;
    const pos: Position = position || {...codeMirror.getDoc().getCursor('start')};

    if (pos.sticky === 'after') {
      pos.ch = +1;
    }

    const cursor = codeMirror.getTokenAt(pos);
    if (!cursor.type) {
      return [];
    }

    const states = cursor.type.split(' ');

    if (states.includes('variable-2')) {
      const text = codeMirror.getDoc().getLine(pos.line);
      const index = states.indexOf('variable-2');
      states[index] = /^\s*\d+\.\s/.test(text) ? 'ordered-list' : 'unordered-list';
    }
    return states;
  }

  private toggleHorizontalRule(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    const codeMirrorEditor = this.codeMirrorEditor!;
    const cursorStart = codeMirrorEditor.getDoc().getCursor('start');
    const lineLength = codeMirrorEditor.getDoc().getLine(cursorStart.line).trim().length;
    const newLine = cursorStart.ch === 0 && lineLength === 0;
    const appendStr = (newLine ? '\n' : '\n\n');
    this.insertAtCursor(appendStr + insertBlocks.hr + appendStr);
    cursorStart.line += newLine ? 1 : 2;
    codeMirrorEditor.getDoc().setSelection(cursorStart, cursorStart);
    codeMirrorEditor.focus();
  }

  private toggleStrikethrough(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.processBlock('strikethrough');
  }

  private toggleBold(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.processBlock('strong');
  }

  private toggleItalic(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.processBlock('italic');
  }

  private toggleBlockquote(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.processLine('quote', '>');
  }

  private toggleUnorderedList(event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.processLine('unordered-list', '*');
  }

  private toggleOrderedList(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.processLine('ordered-list');
  }

  private toggleHeader(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.processLine('header', '#');
  }

  private insertTable(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.insertAtCursor(insertBlocks.table, 2, 8);
  }

  private toggleCode(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    if (this.isSelectionInline()) {
      this.processBlock('inline-code');
    } else {
      this.processBlock('code', true);
    }
  }

  private undo(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.codeMirrorEditor!.getDoc().undo();
    this.codeMirrorEditor!.focus();
  }

  private redo(event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    this.codeMirrorEditor!.getDoc().redo();
    this.codeMirrorEditor!.focus();
  }

  /*****  LIT ELEMENT HOOKS ******/

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.dispatchMarkdownUpdatedDebounce();
  }

  protected update(changedProperties: ChangedProps): void {
    if (changedProperties.has('toolbarButtonsConfig')) {
      const normalizedToolBartConfig: Map<ToolBarOption, ToolBarConfigItem> = new Map();
      (this.toolbarButtonsConfig || []).forEach(it => normalizedToolBartConfig.set(it.name, it));
      this.normalizedToolBarConfig = normalizedToolBartConfig;
    }

    super.update(changedProperties);
  }

  protected async firstUpdated(): Promise<void> {
    await this.updateComplete;
    this.ready();
    this.isElementInitialized = true;
  }

  protected updated(changedProperties: ChangedProps): void {
    if (changedProperties.has('fullscreen')) {
      this.observeFullscreen();
    }

    if (changedProperties.has('markdown')) {
      this.observeMarkdownChanged();
    }
  }

  protected render() {
    // noinspection CssUnresolvedCustomPropertySet
    return html`
      <!--suppress CssUnresolvedCustomProperty -->
      <style>
        ${codeMirrorStylesText}
        :host {
          display: block;
          border: 1px solid var(--exmg-markdown-editor-border, #ddd);
          overflow: hidden;
          font-family: 'Roboto', 'Noto', sans-serif;
          -webkit-font-smoothing: antialiased;
          font-size: 14px;
          font-weight: 400;
          line-height: 20px;
          @apply --exmg-markdown-editor;
        }
        #editor {
          overflow: auto;
        }
        ::slotted(*) {
          display: none;
          overflow: auto;
        }
        :host([split-view]) ::slotted(*) {
          display: block;
          background: var(--exmg-markdown-editor-preview-background, white);
          border-left: 1px solid var(--exmg-markdown-editor-border, #ddd);
          padding: 16px;
          @apply --exmg-markdown-editor-preview;
        }
        .container {
          box-sizing: border-box;
          background: var(--exmg-markdown-editor-background-color, white);
          @apply --layout-horizontal;
        }
        /* No importants! */
        :host([fullscreen]) .container {
          position: fixed !important;
          top: calc(50px + var(--exmg-markdown-editor-fullscreen-top-offset, 0px));
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9;
        }
        :host([split-view]) ::slotted(*),
        .container > * {
          @apply --layout-flex;
        }
        :host([line-numbers]) .container #editor {
          padding: 0;
        }
        /* No importants! */
        .CodeMirror {
          height: 100% !important;
          min-height: 300px;
          font: inherit;
          z-index: 1;
          padding: 16px;
          background: var(--exmg-markdown-editor-code-background, #f4f5f7);
          @apply --exmg-markdown-editor-code;
        }
        .CodeMirror-scroll {
          min-height: 300px
        }
        .CodeMirror:not(.CodeMirror-focused):hover {
          background: var(--exmg-markdown-editor-code-hover, white);
        }
        .CodeMirror-focused {
          box-sizing: border-box;
          box-shadow: inset 0 0 0 2px Highlight;
          box-shadow: inset 0 0 0 2px -webkit-focus-ring-color;
          overflow: hidden;
          background: white;
          @apply --exmg-markdown-editor-code-focused;
        }
        .toolbar {
          position: relative;
          padding: 8px 10px;
          border-bottom: 1px solid var(--exmg-markdown-editor-border, #ddd);
          background: var(--exmg-markdown-editor-toolbar-background, #fafafa);
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -o-user-select: none;
          user-select: none;
          @apply --exmg-markdown-editor-toolbar;
        }
        :host([fullscreen]) .toolbar {
          width: 100%;
          box-sizing: border-box;
          height: 50px;
          overflow-x: auto;
          overflow-y: hidden;
          white-space: nowrap;
          padding: 10px 10px;;
          position: fixed;
          top: calc(0px + var(--exmg-markdown-editor-fullscreen-top-offset, 0px));
          left: 0;
          z-index: 1;
        }
        .toolbar a {
          display: inline-block;
          text-align: center;
          text-decoration: none;
          margin: 0;
          border-radius: 4px;
          color: var(--exmg-markdown-editor-toolbar-color, rgba(0, 0, 0, 0.87));
          border: 1px solid transparent;
          cursor: pointer;
          @apply --exmg-markdown-editor-toolbar-button;
        }
        .toolbar a iron-iconŪ {
          margin: 4px;
          width: 22px;
          height: 22px;
          @apply --exmg-markdown-editor-toolbar-button-icon;
        }
        .toolbar a[disabled] {
          color: var(--exmg-markdown-editor-toolbar-color-disabled, rgba(0, 0, 0, 0.54));
        }
        .toolbar a:hover {
          background: var(--exmg-markdown-editor-toolbar-button-background-hover, #fafafa);
          @apply --exmg-markdown-editor-toolbar-button-hover;
        }
        .toolbar .seperator {
          margin: 0 8px;
          border-left: 1px solid var(--exmg-markdown-editor-toolbar-seperator-color, #ddd);
        }
      </style>

      <div id="toolbar" class="toolbar">
        ${
          repeat<ToolBarConfigItem | EmptyToolBartConfigItem>(
            this.getToolbar(this.toolbarButtons),
            (it, index: number) => isToolBartConfigItem(it) ? it.name : `empty_${index}`,
            (it) => {
              if (isToolBartConfigItem(it)) {
                return html`
                  <a
                    href="#"
                    title="${it.name}"
                    class="${it.className}"
                    @click="${it.action}">
                      <iron-icon icon="${it.icon}"></iron-icon>
                  </a>
                `;
              }
              return html`<span class="seperator"></span>`;
            }
      )}
      </div>
      <div class="container">
        <div id="editor"></div>
          <slot></slot>
      </div>
    `;
  }
}
