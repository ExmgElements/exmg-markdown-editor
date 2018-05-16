import {PolymerElement, html} from '@polymer/polymer/polymer-element.js';
import '@polymer/iron-flex-layout/iron-flex-layout.js';
import '@polymer/iron-icon/iron-icon.js';
import './exmg-markdown-editor-icons.js';
import './exmg-markdown-codemirror-styles.js';

import {afterNextRender} from '@polymer/polymer/lib/utils/render-status.js';

/**
* @namespace Exmg
*/
window.Exmg = window.Exmg || {};

const isMac = /Mac/.test(navigator.platform);
const convertShortcut = (name) => {
  return isMac ? name : name.replace('Cmd', 'Ctrl');
};
const insertBlocks = {
  hr: '---',
  link: '[](#url#)',
  image: '![](#url#)',
  table: '| Column 1 | Column 2 |\n| -------- | -------- |\n| Text     | Text     |',
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
*
* @customElement
* @polymer
* @group Exmg Core Elements
* @element exmg-markdown-editor
* @demo demo/index.html
* @memberof Exmg
* @extends Polymer.Element
* @summary Markdown editor element
*/

class EditorElement extends PolymerElement {
  static get is() {
    return 'exmg-markdown-editor';
  }
  static get properties() {
    return {
      autoFocus: {
        type: Boolean,
        value: false,
      },
      lineNumbers: {
        type: Boolean,
        value: false,
      },
      indentWithTabs: {
        type: Boolean,
        value: true,
      },
      markdown: {
        type: String,
        notify: true,
        observer: '_markdownChanged',
      },
      splitView: {
        type: Boolean,
        reflectToAttribute: true,
        value: false,
      },
      fullscreen: {
        type: Boolean,
        reflectToAttribute: true,
        value: false,
        observer: '_observeFullscreen',
      },
      toolbarButtons: {
        type: Array,
        value: () => ['undo', 'redo', '|', 'header', 'strong', 'italic', 'strikethrough',
          '|', 'quote', 'hr', 'table', 'code', '|', 'unordered-list',
          'ordered-list', '|', 'fullscreen', 'split-view'],
      },
      _toolbarButtons: {
        type: Array,
        value: [{
          name: 'undo',
          icon: 'exmg-markdown-editor-icons:undo',
          action: '_undo',
          className: 'btn-undo',
          title: 'Undo',
        }, {
          name: 'redo',
          icon: 'exmg-markdown-editor-icons:redo',
          action: '_redo',
          className: 'btn-redo',
          title: 'Redo',
        }, {
          name: 'header',
          icon: 'exmg-markdown-editor-icons:text-fields',
          action: '_toggleHeader',
          className: 'btn-header',
          title: 'Header',
        }, {
          name: 'strong',
          icon: 'exmg-markdown-editor-icons:format-bold',
          action: '_toggleBold',
          className: 'btn-bold',
          title: 'Bold',
        }, {
          name: 'italic',
          icon: 'exmg-markdown-editor-icons:format-italic',
          action: '_toggleItalic',
          className: 'btn-italic',
          title: 'Italic',
        }, {
          name: 'strikethrough',
          icon: 'exmg-markdown-editor-icons:format-strikethrough',
          action: '_toggleStrikethrough',
          className: 'btn-strikethrough',
          title: 'Strikethrough',
        }, {
          name: 'quote',
          icon: 'exmg-markdown-editor-icons:format-quote',
          action: '_toggleBlockquote',
          className: 'btn-quote-left',
          title: 'Quote',
        }, {
          name: 'hr',
          icon: 'exmg-markdown-editor-icons:trending-flat',
          action: '_toggleHorizontalRule',
          className: 'btn-horizontal-rule',
          title: 'Horizontal Rule',
        }, {
          name: 'code',
          icon: 'exmg-markdown-editor-icons:code',
          action: '_toggleCode',
          className: 'btn-code',
          title: 'Code',
        }, {
          name: 'table',
          icon: 'exmg-markdown-editor-icons:grid-on',
          action: '_insertTable',
          className: 'btn-table',
          title: 'Table',
        }, {
          name: 'unordered-list',
          icon: 'exmg-markdown-editor-icons:format-list-bulleted',
          action: '_toggleUnorderedList',
          className: 'btn-list-ul',
          title: 'Generic List',
        }, {
          name: 'ordered-list',
          icon: 'exmg-markdown-editor-icons:format-list-numbered',
          action: '_toggleOrderedList',
          className: 'btn-list-ol',
          title: 'Numbered List',
        }, {
          name: 'fullscreen',
          icon: 'exmg-markdown-editor-icons:fullscreen',
          action: '_toggleFullscreen',
          className: 'btn-fullscreen',
          title: 'Fullscreen',
        }, {
          name: 'split-view',
          icon: 'exmg-markdown-editor-icons:chrome-reader-mode',
          action: '_toggleSplitView',
          className: 'btn-split-view',
          title: 'Split View',
        }],
      },
      shortcuts: {
        type: Object,
        value: {
          'undo': 'Cmd-Z',
          'redo': 'Cmd-Y',
          'strong': 'Cmd-B',
          'italic': 'Cmd-I',
          'quote': 'Cmd-\'',
          'unordered-list': 'Cmd-Alt-L',
          'ordered-list': 'Cmd-L',
          'split-view': 'F9',
          'fullscreen': 'F11',
        },
      },
    };
  }
  static get template() {
    return html`<style include="codemirror-style-element">
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

      .toolbar a iron-icon {
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
      <template is="dom-repeat" items="{{_getToolbar(toolbarButtons)}}" as="button">
        <template is="dom-if" if="[[button.name]]">
          <a href="#" title="[[button.title]]" class\$="[[button.className]]" on-click="_handleToolbarClick"><iron-icon icon="[[button.icon]]"></iron-icon></a>
        </template>
        <template is="dom-if" if="[[!button.name]]">
          <span class="seperator"></span>
        </template>
      </template>
    </div>
    <div class="container">
      <div id="editor"></div>
      <slot></slot>
    </div>
    `;
  }
  get markdownElement() {
    return this.querySelector('marked-element');
  }
  /**
   * When ready check if markdown property is set or otherwise look for script tag
   */
  ready() {
    super.ready();
    this.setupEditor();

    var self = this;
    const markedElement = this.markdownElement;

    if (markedElement.markdown) {
      this.codeMirror.setValue(markedElement.markdown);
      setTimeout(() => {
        this.codeMirror.refresh();
      }, 0);
    } else {
      markedElement.addEventListener('marked-render-complete', function onMarkedLoadend(event) {
        markedElement.removeEventListener('marked-render-complete', onMarkedLoadend);
        self.set('markdown', markedElement.markdown);
      });
    }
  }
  /**
   * Helper method that creates button array from toolbar config property
   * @param {Array} toolbarConfig
   * @return {Array}
   */
  _getToolbar(toolbarConfig) {
    const toolbar = [];
    toolbarConfig.forEach((c) => {
      if (c === '|') {
        toolbar.push({});
        return;
      }
      const item = this._toolbarButtons.find((btn) => btn.name === c);
      if (item) {
        toolbar.push(item);
      }
    });
    return toolbar;
  }

  _markdownChanged(markdown) {
    if (this.codeMirror.getValue() !== markdown) {
      this.codeMirror.setValue(markdown);
    }
    if (this.markdownElement) {
      this.markdownElement.markdown = markdown;
    }
    this._updateDocHistory();
  }

  /**
   * Manages the undo/redo disabled state based uppon the available hidtory in code mirror
   * @param {string} text
   * @return {string}
   */
  _updateDocHistory() {
    if (!this.codeMirror) {
      return;
    }
    const {undo, redo} = this.codeMirror.doc.historySize();

    const undoEl = this.shadowRoot.querySelector('.btn-undo');
    if (undoEl) {
      if (undo > 0) {
        undoEl.removeAttribute('disabled');
      } else {
        undoEl.setAttribute('disabled', true);
      }
    }

    const redoEl = this.shadowRoot.querySelector('.btn-redo');
    if (redoEl) {
      if (redo > 0) {
        redoEl.removeAttribute('disabled');
      } else {
        redoEl.setAttribute('disabled', true);
      }
    }
  }
  _toggleFullscreen() {
    this.set('fullscreen', !this.fullscreen);
  }
  _toggleSplitView() {
    this.set('splitView', !this.splitView);
  }
  _observeFullscreen(fullscreen) {
    if (!this.codeMirror) {
      return;
    }
    this.codeMirror.setOption('fullScreen', fullscreen);
  }
  _handleToolbarClick(e) {
    e.preventDefault();
    this[e.model.button.action](); // Deconstruction for better reading?
  }
  setupEditor() {
    /* initialize key map */
    const keyMaps = {
      'Tab': (codeMirror) => {
        const ranges = codeMirror.listSelections();
        const pos = ranges[0].head;
        const eolState = codeMirror.getStateAfter(pos.line);
        const inList = eolState.list !== false;

        if (inList) {
          codeMirror.execCommand('indentMore');
          return;
        }

        if (codeMirror.options.indentWithTabs) {
          codeMirror.execCommand('insertTab');
        } else {
          var spaces = Array(codeMirror.options.tabSize + 1).join(' ');
          codeMirror.replaceSelection(spaces);
        }
      },
      'Shift-Tab': (codeMirror) => {
        const ranges = codeMirror.listSelections();
        const pos = ranges[0].head;
        const eolState = codeMirror.getStateAfter(pos.line);
        const inList = eolState.list !== false;

        if (inList) {
          codeMirror.execCommand('indentLess');
          return;
        }

        if (codeMirror.options.indentWithTabs) {
          codeMirror.execCommand('insertTab');
        } else {
          const spaces = Array(codeMirror.options.tabSize + 1).join(' ');
          codeMirror.replaceSelection(spaces);
        }
      },
      'Esc': (codeMirror) => {
        if (codeMirror.getOption('fullScreen')) {
          this.set('fullscreen', false);
        }
      }
    };

    for (var key in this.shortcuts) {
      const actionBtn = this._toolbarButtons.find((tb) => tb.name === key); // keep var names fullnamed?
      if (this.shortcuts[key] !== null && actionBtn) {
        keyMaps[convertShortcut(this.shortcuts[key])] = () => this[actionBtn.action](); // _ or () ?
      }
    }

    /* initialize code mirror */
    this.codeMirror = CodeMirror(this.$.editor, {
      mode: 'markdown',
      value: this.markdown || '',
      tabSize: 2,
      indentUnit: 2,
      indentWithTabs: this.indentWithTabs,
      lineNumbers: this.lineNumbers,
      autofocus: this.autoFocus,
      extraKeys: keyMaps,
      lineWrapping: true,
      allowDropFileTypes: ['text/plain']
    });

    /* Update markdown property with latest changes */
    this.codeMirror.on('change', (codeMirror, changeObj) => {
      this.set('markdown', codeMirror.getValue());
      this.dispatchEvent(new CustomEvent('value-change', {bubbles: true, composed: true, detail: codeMirror.getValue()}));
    });

    /* Update markdown property with latest changes */
    this.codeMirror.on('blur', (codeMirror, event) => {
      this.dispatchEvent(new CustomEvent('value-change', {bubbles: true, composed: true, detail: {codeMirror, event}}));
    });

    afterNextRender(this, _ => this._updateDocHistory()); // _ or () ?
  }
  _replaceRangeLine(text, lineNumber) {
    this.codeMirror.replaceRange(text, {line: lineNumber, ch: 0}, {line: lineNumber, ch: 99999999999999});
  }
  _insertAtCursor(text, selectionOffset, selectionLength) {
    const {codeMirror} = this;

    codeMirror.replaceSelection(text, 'start');

    const cursorStart = codeMirror.getCursor();
    cursorStart.ch += selectionOffset || 0;
    codeMirror.setSelection(cursorStart, {line: cursorStart.line, ch: cursorStart.ch + (selectionLength || text.lenth)});
    codeMirror.focus();
  }
  _hasType(states, type) {
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
  _processBlock(type, newLine) {
    const codeMirror = this.codeMirror;
    const states = this._getStates();
    const blockStyles = {
      'strong': '**',
      'inline-code': '`',
      'code': '```',
      'italic': '*',
      'strikethrough': '~~',
    };

    const cursorStart = codeMirror.getCursor('start');
    const cursorEnd = codeMirror.getCursor('end');
    const multiLineSelection = cursorStart.line !== cursorEnd.line;
    const selectionText = codeMirror.getSelection();
    const emptySelection = selectionText === '';

    if (this._hasType(states, type)) {
      const line = codeMirror.getLine(cursorStart.line);
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
      this._replaceRangeLine(start + selectionText + end, cursorStart.line);
      cursorStart.ch -= blockStyles[type].length;
      cursorEnd.ch -= blockStyles[type].length;
    } else {
      const text = blockStyles[type] + (type === 'code' ? '\n' : '')
        + (emptySelection ? type + ' text' : selectionText)
        + (type === 'code' ? '\n' : '') + blockStyles[type];
      codeMirror.replaceSelection(text);
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

    codeMirror.setSelection(cursorStart, cursorEnd);
    codeMirror.focus();
  }
  _processLine(type, symbol) {
    const codeMirror = this.codeMirror;
    const cursorStart = codeMirror.getCursor('start');
    const cursorEnd = codeMirror.getCursor('end');

    let lineCount = 0;
    for (let i = cursorStart.line; i <= cursorEnd.line; i++) {
      const linestart = Object.assign(Object.assign({}, cursorStart), {line: i, ch: 0, sticky: 'after'});
      const states = this._getStates(linestart);
      let text = codeMirror.getLine(i);
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
          text = stateFound ? text.substring(3) : (lineCount + 1) + '. ' + text;
          break;
      }
      this._replaceRangeLine(text, i);
      lineCount++;
    }

    codeMirror.setSelection(cursorStart, cursorEnd);
    codeMirror.focus();
  }
  _isSelectionInline() {
    const codeMirror = this.codeMirror;
    const cursorStart = codeMirror.getCursor('start');
    const cursorEnd = codeMirror.getCursor('end');
    const lineLength = codeMirror.getLine(cursorStart.line).length;
    return cursorStart.line === cursorEnd.line && (cursorEnd.ch - cursorStart.ch !== lineLength);
  }
  _getStates(pos) {
    const codeMirror = this.codeMirror;
    pos = pos || Object.assign({}, codeMirror.getCursor('start'));

    if (pos.sticky === 'after') {
      pos.ch++;
    }

    const cursor = codeMirror.getTokenAt(pos);
    if (!cursor.type) {
      return [];
    }

    const states = cursor.type.split(' ');

    if (states.includes('variable-2')) {
      const text = codeMirror.getLine(pos.line);
      const index = states.indexOf('variable-2');
      states[index] = /^\s*\d+\.\s/.test(text) ? 'ordered-list' : 'unordered-list';
    }
    return states;
  }
  _toggleHorizontalRule() {
    const {codeMirror} = this;
    const cursorStart = codeMirror.getCursor('start');
    const lineLength = codeMirror.getLine(cursorStart.line).trim().length;
    const newLine = cursorStart.ch === 0 && lineLength === 0;
    const appendStr = (newLine ? '\n' : '\n\n');
    this._insertAtCursor(appendStr + insertBlocks.hr + appendStr);
    cursorStart.line += newLine ? 1 : 2;
    codeMirror.setSelection(cursorStart, cursorStart);
    codeMirror.focus();
  }
  _toggleStrikethrough() {
    this._processBlock('strikethrough');
  }
  _toggleBold() {
    this._processBlock('strong');
  }
  _toggleItalic() {
    this._processBlock('italic');
  }
  _toggleBlockquote() {
    this._processLine('quote', '>');
  }
  _toggleUnorderedList() {
    this._processLine('unordered-list', '*');
  }
  _toggleOrderedList() {
    this._processLine('ordered-list');
  }
  _toggleHeader() {
    this._processLine('header', '#');
  }
  _insertTable() {
    this._insertAtCursor(insertBlocks.table, 2, 8);
  }
  _toggleCode() {
    if (this._isSelectionInline()) {
      this._processBlock('inline-code');
    } else {
      this._processBlock('code', true);
    }
  }
  _undo(editor) {
    const {codeMirror} = this;
    codeMirror.undo();
    codeMirror.focus();
  }
  _redo(editor) {
    const {codeMirror} = this;
    codeMirror.redo();
    codeMirror.focus();
  }
}

window.customElements.define(EditorElement.is, EditorElement);
Exmg.EditorElement = EditorElement;

