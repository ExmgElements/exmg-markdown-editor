export const promisifyFlush = (flush) => () => new Promise(resolve => flush(resolve));
const onEvent = (eventName) => (element) => new Promise(resolve => {
    element.addEventListener(eventName, (event) => resolve(event));
});
export const onExmgMarkdownEditorFullscreen = onEvent('exmg-markdown-editor-fullscreen');
export const onValueChange = onEvent('value-change');
