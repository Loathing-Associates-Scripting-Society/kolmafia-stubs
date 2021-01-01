import {DOMParser, XMLSerializer} from 'xmldom';

import {cleanHtml} from '../lib/clean-html';
import {evaluateXPath, isElement} from '../lib/xpather';

/**
 * Implementation of KoLmafia's `xpath()` function.
 * @param html XML or HTML markup. This is sanitized
 * @param selector XPath selector supported by HtmlCleaner.
 */
export function xpath(html: string, selector: string): string[] {
  const cleanedHtml = cleanHtml(html);
  const xmlSerializer = new XMLSerializer();

  return evaluateXPath(
    new DOMParser().parseFromString(cleanedHtml).documentElement,
    selector
  ).map(result =>
    isElement(result) ? xmlSerializer.serializeToString(result) : String(result)
  );
}
