import {LitElement} from 'lit-element';

export const promisifyFlush = (flush: Function) => () => new Promise(resolve => flush(resolve));

const onEvent: (eventName: string) => (element: LitElement) => Promise<any> =
  (eventName: string) => (element: LitElement) => new Promise(resolve => {
    element.addEventListener(eventName, (event: Event) => resolve(event));
  });

export const onExmgMarkdownEditorFullscreen: (element: LitElement) => Promise<any> = onEvent('exmg-markdown-editor-fullscreen');

export const onValueChange: (element: LitElement) => Promise<any> = onEvent('value-change');
