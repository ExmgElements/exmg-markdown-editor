import {EditorElement} from '../exmg-markdown-editor';
import {promisifyFlush, onValueChange, onExmgMarkdownEditorFullscreen} from './utils';

declare const fixture: <T extends HTMLElement = HTMLElement>(id: string, model?: object) => T;
declare const flush: (cb?: Function) => void;

const {assert} = chai;

suite('<exmg-markdown-editor>', function () {
  let element: EditorElement;
  const flushCompleted = promisifyFlush(flush);

  suite('base usage', function () {
    setup(() => {
      element = fixture('BasicTestFixture');
    });

    test('check if default toolbar is rendered correctly', async function () {
      await flushCompleted();
      const elements = element.shadowRoot!.querySelectorAll('#toolbar a');
      assert.equal(elements.length, 14, 'By default should be 14 items in tool bar');
    });

    test('check attribute split-view is reflected', async function () {
      await flushCompleted();

      const getMarkdownElementComputedStyle = () =>
        window.getComputedStyle(element.querySelector('marked-element')!);

      assert.isTrue(element.hasAttribute('split-view'), 'split-view attr should be reflected by default');
      assert.isTrue(element.splitView, 'splitView prop should be turn on by default');
      assert.equal(getMarkdownElementComputedStyle().display, 'block', 'markdown preview is visible in split view mode');

      element.splitView = false;
      await flushCompleted();
      assert.equal(getMarkdownElementComputedStyle().display, 'none', 'markdown preview is not visible in split view mode');
      assert.isFalse(element.hasAttribute('split-view'), 'Attribute split view is not present when turn off');
    });

    test('check attribute fullscreen is reflected', async function () {
      await flushCompleted();
      assert.isFalse(element.hasAttribute('fullscreen'), 'fullscreen attr is not reflected by default');
      assert.isFalse(element.fullscreen, 'fullscreen prop should be turn off by default');

      element.fullscreen = true;
      await flushCompleted();
      assert.isTrue(element.hasAttribute('fullscreen'), 'Attribute fullscreen should be reflected');
    });

    test('event exmg-markdown-editor-fullscreen should be triggered', async function () {
        await flushCompleted();
        element.fullscreen = true;
        const eventOn = await onExmgMarkdownEditorFullscreen(element);
        assert.instanceOf(eventOn, CustomEvent);
        assert.isTrue(eventOn.detail, 'Should be triggered event when fullscreen on');

        element.fullscreen = false;
        const eventOff = await onExmgMarkdownEditorFullscreen(element);
        assert.instanceOf(eventOff, CustomEvent);
        assert.isFalse(eventOff.detail, 'Should be triggered event when fullscreen off');
    });

    test('event value-change should be triggered', async function () {
      const firstEvent = await onValueChange(element);
      await flushCompleted();
      assert.instanceOf(firstEvent, CustomEvent);
      assert.include(firstEvent.detail, 'Lorem **ipsum**', 'Should be triggered initial event with markdown value');

      element.markdown = `__TEST__`;
      const secondEvent = await onValueChange(element);
      assert.instanceOf(secondEvent, CustomEvent);
      assert.equal(secondEvent.detail, '__TEST__', 'Should be triggered event with updated value');
    });

  });

  suite('with custom toolbar and autofocus', function () {
    setup(() => {
      element = fixture('ExmgToolBarTestFixture');
    });

    test('element has 2 items in toolbar', async function () {
      await flushCompleted();
      const elements = element.shadowRoot!.querySelectorAll('#toolbar a');
      assert.equal(elements.length, 2, 'There should be 2 items in toolbar');
    });

    test('element editor is focused', async function () {
      await flushCompleted();
      const editorTextArea = element.shadowRoot!.querySelector('#editor textarea');
      assert.instanceOf(editorTextArea, HTMLTextAreaElement, 'Text area exists');
      assert.equal(element.shadowRoot!.activeElement, editorTextArea, 'Text area is active');
    });

  });

  suite('Raw text should be parsed to html', function () {
    let getMarkdownElementText: (selector: string) => string | undefined;
    setup(() => {
      element = fixture('ExmgStylingTextFixture');
      const markdownBody = element.querySelector('.markdown-body')!;

      getMarkdownElementText = (selector: string) =>
        (markdownBody.querySelector<HTMLElement>(selector) || {innerText: undefined})!.innerText;
    });

    test('Should parse headers', async function () {
      await flushCompleted();

      assert.equal(getMarkdownElementText('h1#h1'), 'H1', '#H1 is present as <h1>');
      assert.equal(getMarkdownElementText('h2#h2'), 'H2', '##H2 is present as <h2>');
      assert.equal(getMarkdownElementText('h3#h3'), 'H3', '###H3 is present as <h2>');
      assert.equal(getMarkdownElementText('h4#h4'), 'H4', '####H4 is present as <h4>');
      assert.equal(getMarkdownElementText('h5#h5'), 'H5', '#####H5 is present as <h5>');
      assert.equal(getMarkdownElementText('h6#h6'), 'H6', '######H6 is present as <h6>');
    });

    test('Should parse text', async function () {
      await flushCompleted();

      assert.equal(getMarkdownElementText('p strong'), 'ipsum', '**ipsum** is present as <strong>');
      assert.equal(getMarkdownElementText('p del'), 'consectetur adipiscing', '~~consectetur adipiscing~~ is present as <del>');
      assert.equal(getMarkdownElementText('p em'), 'eiusmod', '*eiusmod* is present as <em>');
    });

    test('Should parse table', async function () {
      await flushCompleted();

      assert.equal(getMarkdownElementText('table th:nth-child(1)'), 'User Name', '|User name| is present as <table>');
      assert.equal(getMarkdownElementText('table th:nth-child(2)'), 'Email', '|Email| is present as <table>');
    });

    test('Should parse quote', async function () {
      await flushCompleted();

      assert.include(getMarkdownElementText('blockquote')!, 'Lorem ipsum dolor', '> is present as <blockquote>');
    });

    test('Should parse list', async function () {
      await flushCompleted();

      assert.equal(getMarkdownElementText('ul li:nth-child(1)'), 'List option 1', '* List option 1 is present as <ul><li>');
      assert.equal(getMarkdownElementText('ul li:nth-child(2)'), 'List option 2', '* List option 2 is present as <ul><li>');
      assert.equal(getMarkdownElementText('ol li:nth-child(1)'), 'List option 1', '1. List option 1 is present as <ol><li>');
      assert.equal(getMarkdownElementText('ol li:nth-child(2)'), 'List option 2', '2. List option 2 is present as <ol><li>');
    });

    test('Should parse hr', async function () {
      await flushCompleted();

      assert.equal(getMarkdownElementText('hr'), '', '--- 1 is present as <hr>');
    });

    test('Should parse code', async function () {
      await flushCompleted();

      assert.equal(getMarkdownElementText('p code'), 'Inline code', '`` is present as <code>');
      assert.equal(getMarkdownElementText('pre code'), 'Block\ncode\n', '``` is present as <pre><code>');
    });

    test('Should parse image', async function () {
      await flushCompleted();
      const img = element.querySelector<HTMLImageElement>('.markdown-body img')!;

      assert.instanceOf(img, HTMLImageElement, 'Image is preset');
      assert.equal(img.src, 'https://www.polymer-project.org/images/logos/p-logo.png', 'Image has proper src attribute');
      assert.equal(img.alt, 'Yes', 'Image has proper alt attribute');
    });

  });
});
