/**
 * @file This is a TypeScript port of HtmlCleaner's XPath implementation,
 * converted to use JavaScript DOM methods.
 * This is used to replicate HtmlCleaner's behavior, which is quite different
 * from standards-compliant XPath evaluators.
 *
 * This has been tested with xmldom 0.4.0 (https://github.com/xmldom/xmldom),
 * but should work with other DOM Level 2-compatible implementations.
 *
 * This code is derived from:
 *    https://sourceforge.net/p/htmlcleaner/code/HEAD/tree/tags/htmlcleaner-2.24/src/main/java/org/htmlcleaner/XPather.java
 *    https://sourceforge.net/p/htmlcleaner/code/HEAD/tree/tags/htmlcleaner-2.24/src/main/java/org/htmlcleaner/TagNode.java
 */

/**
 * Interface that represents a DOM node.
 * This is a subset of the W3C DOM Level 2 Node interface.
 */
export interface XPatherNode {
  readonly nodeName: string;
  readonly nodeType: number;
  readonly parentNode: XPatherNode | null;
  readonly childNodes: {
    length: number;
    item(index: number): XPatherNode;
    [index: number]: XPatherNode;
  };
  textContent: string | null;

  readonly ELEMENT_NODE: number;
}

/**
 * Interface that represents a tag node.
 * This is a subset of the W3C DOM Level 2 Element interface.
 */
export interface XPatherElement extends XPatherNode {
  // Element attributes and methods
  readonly attributes: {
    readonly length: number;
    item(index: number): XPatherAttr | null;
    [index: number]: XPatherAttr;
  };
  getAttribute(qualifiedName: string): string | null;
  hasAttribute(qualifiedName: string): boolean;
}

/**
 * Interface that represents a tag attribute.
 * This is a subset of the W3C DOM Level 2 Attr interface.
 */
export interface XPatherAttr extends XPatherNode {
  readonly name: string;
  value: string;
}

/*
  The implementation of TagNode and XPather are subject to the BSD-3 license:

  Copyright (c) 2006-2007, Vladimir Nikic
  All rights reserved.

  Redistribution and use of this software in source and binary forms,
  with or without modification, are permitted provided that the following
  conditions are met:

  * Redistributions of source code must retain the above
    copyright notice, this list of conditions and the
    following disclaimer.

  * Redistributions in binary form must reproduce the above
    copyright notice, this list of conditions and the
    following disclaimer in the documentation and/or other
    materials provided with the distribution.

  * The name of HtmlCleaner may not be used to endorse or promote
    products derived from this software without specific prior
    written permission.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
  LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
  CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
  INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
  CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
  POSSIBILITY OF SUCH DAMAGE.

  You can contact Vladimir Nikic by sending e-mail to nikic_vladimir@yahoo.com.
  Please include the word "HtmlCleaner" in the subject line.
*/

// ----------------------------------------------------------------------------
// TagNode methods, converted to work with TagNode objects
// ----------------------------------------------------------------------------

function getAllElementsList(
  el: XPatherElement,
  isRecursive: boolean
): XPatherElement[] {
  return findMatchingTagNodes(el, () => true, isRecursive);
}

/**
 * @param attName
 * @return Value of the specified attribute, or null if it this tag doesn't contain it.
 */
function getAttributeByName(
  el: XPatherElement,
  attName: string
): string | null {
  return el.hasAttribute(attName) ? el.getAttribute(attName) : null;
}

/**
 * Returns the attributes of the tagnode.
 *
 * @return Map instance containing all attribute name/value pairs.
 */
function getAttributes(el: XPatherElement): {[attr: string]: string} {
  const attributes: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; ++i) {
    const attr = el.attributes[i];
    attributes[attr.name] = attr.value;
  }
  return attributes;
}

/**
 * @return Array of child TagNode objects.
 */
function getChildTagList<T extends XPatherElement>(el: T): T[] {
  const childTagList: T[] = [];
  for (let i = 0; i < el.childNodes.length; ++i) {
    const item = el.childNodes[i];
    if (isElementNode<T>(item)) {
      childTagList.push(item);
    }
  }
  return childTagList;
}

function getElementListByName<T extends XPatherElement>(
  el: T,
  findName: string,
  isRecursive: boolean
): T[] {
  const lowerCaseName = findName.toLowerCase();
  return findMatchingTagNodes(
    el,
    e => e.nodeName.toLowerCase() === lowerCaseName,
    isRecursive
  );
}

function getParent<T extends XPatherElement>(el: T): T | null {
  const parent = el.parentNode;
  if (parent && parent.nodeType !== parent.ELEMENT_NODE) {
    throw new Error(
      `Parent node is not an TagNode (nodeType: ${parent.nodeType})`
    );
  }
  return parent as T | null;
}

/**
 * Evaluates XPath expression on give node.
 *
 * *This is not fully supported XPath parser and evaluator.*
 *
 * Examples below show supported elements:
 *
 * - `//div//a`
 * - `//div//a[@id][@class]`
 * - `/body/*[1]/@type`
 * - `//div[3]//a[@id][@href='r/n4']`
 * - `//div[last() >= 4]//./div[position() = last()])[position() > 22]//li[2]//a`
 * - `//div[2]/@*[2]`
 * - `data(//div//a[@id][@class])`
 * - `//p/last()`
 * - `//body//div[3][@class]//span[12.2<position()]/@id`
 * - `data(//a['v' < @id])`
 *
 * @param el
 * @param xPathExpression
 * @return result of XPather evaluation.
 * @throws {XPatherException}
 */
export function evaluateXPath<T extends XPatherElement>(
  el: T,
  xPathExpression: string
): XPatherResult<T>[] {
  return new XPather<T>(xPathExpression).evaluateAgainstNode(el);
}

/**
 * Get all elements in the tree that satisfy specified condition.
 * @param condition
 * @param isRecursive
 * @return List of TagNode instances.
 */
function findMatchingTagNodes<T extends XPatherElement>(
  el: T,
  condition: (e: T) => unknown,
  isRecursive: boolean
): T[] {
  const result: T[] = [];
  if (!condition) {
    return result;
  }

  for (let i = 0; i < el.childNodes.length; ++i) {
    const currNode = el.childNodes[i];
    if (isElementNode<T>(currNode)) {
      if (condition(currNode)) {
        result.push(currNode);
      }
      if (isRecursive) {
        const innerList = findMatchingTagNodes(
          currNode,
          condition,
          isRecursive
        );
        if (innerList.length > 0) {
          result.push(...innerList);
        }
      }
    }
  }

  return result;
}

// ----------------------------------------------------------------------------
// XPather class ported to TypeScript
// ----------------------------------------------------------------------------

export type XPatherResult<T extends XPatherElement> =
  | boolean
  | number
  | string
  | T;

export class XPatherException extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'XPatherException';
  }
}

/**
 * <p>Utility for searching cleaned document tree with XPath expressions.</p>
 * Examples of supported axes:
 * <code>
 * <ul>
 *      <li>//div//a</li>
 *      <li>//div//a[@id][@class]</li>
 *      <li>/body/*[1]/@type</li>
 *      <li>//div[3]//a[@id][@href='r/n4']</li>
 *      <li>//div[last() >= 4]//./div[position() = last()])[position() > 22]//li[2]//a</li>
 *      <li>//div[2]/@*[2]</li>
 *      <li>data(//div//a[@id][@class])</li>
 *      <li>//p/last()</li>
 *      <li>//body//div[3][@class]//span[12.2<position()]/@id</li>
 *      <li>data(//a['v' < @id])</li>
 * </ul>
 * </code>
 */
class XPather<T extends XPatherElement> {
  /** array of basic tokens of which XPath expression is made */
  private tokenArray: string[] = [];

  /**
   * Constructor - creates XPather instance with specified XPath expression.
   * @param expression
   */
  constructor(expression: string) {
    // this is not real XPath compiler, rather simple way to recognize basic XPaths expressions
    // and interpret them against some TagNode instance.

    // Emulate java.util.StringTokenizer by excluding empty strings from the
    // token list
    this.tokenArray = expression
      .split(/([/()[\]"'=<>])/)
      .filter(token => token);
  }

  /**
   * Main public method for this class - a way to execute XPath expression against
   * specified TagNode instance.
   * @param node
   * @throws {XPatherException}
   */
  evaluateAgainstNode(node: T): XPatherResult<T>[] {
    if (node === null) {
      throw new XPatherException(
        'Cannot evaluate XPath expression against null value!'
      );
    }

    return this.evaluateAgainst(
      [node],
      0,
      this.tokenArray.length - 1,
      false,
      1,
      0,
      false
    );
  }

  /**
   * @throws {XPatherException}
   */
  protected evaluateAgainst(
    obj: XPatherResult<T>[] | undefined,
    from: number,
    to: number,
    isRecursive: boolean,
    position: number,
    last: number,
    isFilterContext: boolean,
    filterSource?: XPatherResult<T>[]
  ): XPatherResult<T>[] {
    if (from >= 0 && to < this.tokenArray.length && from <= to) {
      if ('' === this.tokenArray[from].trim()) {
        return this.evaluateAgainst(
          obj,
          from + 1,
          to,
          isRecursive,
          position,
          last,
          isFilterContext,
          filterSource
        );
      } else if (this.isToken('(', from)) {
        const closingBracket = this.findClosingIndex(from, to);
        if (closingBracket > 0) {
          const value = this.evaluateAgainst(
            obj,
            from + 1,
            closingBracket - 1,
            false,
            position,
            last,
            isFilterContext,
            filterSource
          );
          return this.evaluateAgainst(
            value,
            closingBracket + 1,
            to,
            false,
            position,
            last,
            isFilterContext,
            filterSource
          );
        } else {
          throwStandardException();
        }
      } else if (this.isToken('[', from)) {
        const closingBracket = this.findClosingIndex(from, to);
        if (closingBracket > 0) {
          const value = obj
            ? this.filterByCondition(obj, from + 1, closingBracket - 1)
            : [];
          return this.evaluateAgainst(
            value,
            closingBracket + 1,
            to,
            false,
            position,
            last,
            isFilterContext,
            filterSource
          );
        } else {
          throwStandardException();
        }
      } else if (this.isToken('"', from) || this.isToken("'", from)) {
        // string constant
        const closingQuote = this.findClosingIndex(from, to);
        if (closingQuote > from) {
          const value = [this.flatten(from + 1, closingQuote - 1)];
          return this.evaluateAgainst(
            value,
            closingQuote + 1,
            to,
            false,
            position,
            last,
            isFilterContext,
            filterSource
          );
        } else {
          throwStandardException();
        }
      } else if (
        (this.isToken('=', from) ||
          this.isToken('<', from) ||
          this.isToken('>', from)) &&
        isFilterContext
      ) {
        // operator inside filter
        let logicValue: boolean;
        if (
          this.isToken('=', from + 1) &&
          (this.isToken('<', from) || this.isToken('>', from))
        ) {
          const secondObject = this.evaluateAgainst(
            filterSource,
            from + 2,
            to,
            false,
            position,
            last,
            isFilterContext,
            filterSource
          );
          logicValue = evaluateLogic(
            obj,
            secondObject,
            this.tokenArray[from] + this.tokenArray[from + 1]
          );
        } else {
          const secondObject = this.evaluateAgainst(
            filterSource,
            from + 1,
            to,
            false,
            position,
            last,
            isFilterContext,
            filterSource
          );
          logicValue = evaluateLogic(obj, secondObject, this.tokenArray[from]);
        }
        return [logicValue];
      } else if (this.isToken('/', from)) {
        // children of the node
        const goRecursive = this.isToken('/', from + 1);
        if (goRecursive) {
          from++;
        }
        if (from < to) {
          let toIndex = this.findClosingIndex(from, to) - 1;
          if (toIndex <= from) {
            toIndex = to;
          }
          const value = this.evaluateAgainst(
            obj,
            from + 1,
            toIndex,
            goRecursive,
            1,
            last,
            isFilterContext,
            filterSource
          );
          return this.evaluateAgainst(
            value,
            toIndex + 1,
            to,
            false,
            1,
            last,
            isFilterContext,
            filterSource
          );
        } else {
          throwStandardException();
        }
      } else if (this.isFunctionCall(from, to)) {
        const closingBracketIndex = this.findClosingIndex(from + 1, to);
        const funcValue = obj
          ? this.evaluateFunction(
              obj,
              from,
              to,
              position,
              last,
              isFilterContext
            )
          : [];
        return this.evaluateAgainst(
          funcValue,
          closingBracketIndex + 1,
          to,
          false,
          1,
          last,
          isFilterContext,
          filterSource
        );
      } else if (isValidInteger(this.tokenArray[from])) {
        const value = [parseInt(this.tokenArray[from])];
        return this.evaluateAgainst(
          value,
          from + 1,
          to,
          false,
          position,
          last,
          isFilterContext,
          filterSource
        );
      } else if (isValidDouble(this.tokenArray[from])) {
        const value = [parseFloat(this.tokenArray[from])];
        return this.evaluateAgainst(
          value,
          from + 1,
          to,
          false,
          position,
          last,
          isFilterContext,
          filterSource
        );
      } else {
        return obj
          ? this.getElementsByName(obj, from, to, isRecursive, isFilterContext)
          : [];
      }
    } else {
      return obj || [];
    }
  }

  private flatten(from: number, to: number): string {
    if (from <= to) {
      return this.tokenArray.slice(from, to + 1).join('');
    }
    return '';
  }

  /**
   * Checks if tokens in specified range represents valid function call.
   * @param from
   * @param to
   * @return True if it is valid function call, false otherwise.
   */
  private isFunctionCall(from: number, to: number): boolean {
    if (!isIdentifier(this.tokenArray[from]) && !this.isToken('(', from + 1)) {
      return false;
    }

    return this.findClosingIndex(from + 1, to) > from + 1;
  }

  /**
   * Evaluates specified function.
   * Currently, following XPath functions are supported: last, position, text, count, data
   * @param source
   * @param from
   * @param to
   * @param position
   * @param last
   * @return Result of evaluation.
   * @throws {XPatherException}
   */
  protected evaluateFunction(
    source: XPatherResult<T>[],
    from: number,
    to: number,
    position: number,
    last: number,
    isFilterContext: boolean
  ): XPatherResult<T>[] {
    const name = this.tokenArray[from].trim();
    const result: XPatherResult<T>[] = [];

    source.forEach((curr, index) => {
      index++;
      if ('last' === name) {
        result.push(isFilterContext ? last : source.length);
      } else if ('position' === name) {
        result.push(isFilterContext ? position : index);
      } else if ('text' === name) {
        if (isElement(curr)) {
          result.push(curr.textContent || '');
        } else if (typeof curr === 'string') {
          result.push(curr);
        }
      } else if ('count' === name) {
        const argumentEvaluated = this.evaluateAgainst(
          source,
          from + 2,
          to - 1,
          false,
          position,
          0,
          isFilterContext
        );
        result.push(argumentEvaluated.length);
      } else if ('data' === name) {
        const argumentEvaluated = this.evaluateAgainst(
          source,
          from + 2,
          to - 1,
          false,
          position,
          0,
          isFilterContext
        );
        for (const elem of argumentEvaluated) {
          if (isElement(elem)) {
            result.push(elem || '');
          } else if (typeof elem === 'string') {
            result.push(elem);
          }
        }
      } else {
        throw new XPatherException('Unknown function ' + name + '!');
      }
    });

    return result;
  }

  /**
   * Filter nodes satisfying the condition
   * @param source
   * @param from
   * @param to
   * @throws {XPatherException}
   */
  protected filterByCondition(
    source: XPatherResult<T>[],
    from: number,
    to: number
  ): XPatherResult<T>[] {
    const result: XPatherResult<T>[] = [];
    source.forEach((curr, index) => {
      index++;
      const logicValueList = this.evaluateAgainst(
        [curr],
        from,
        to,
        false,
        index,
        source.length,
        true,
        [curr]
      );
      if (logicValueList.length >= 1) {
        const first = logicValueList[0];
        if (typeof first === 'boolean') {
          if (first) {
            result.push(curr);
          }
        } else if (typeof first === 'number') {
          if (first === index) {
            result.push(curr);
          }
        } else {
          result.push(curr);
        }
      }
    });
    return result;
  }

  private isToken(token: string, index: number): boolean {
    const len = this.tokenArray.length;
    return (
      index >= 0 &&
      index < len &&
      this.tokenArray[index].trim() === token.trim()
    );
  }

  /**
   * @param from
   * @param to
   * @return matching closing index in the token array for the current token, or -1 if there is
   * no closing token within expected bounds.
   */
  private findClosingIndex(from: number, to: number): number {
    if (from < to) {
      const currToken = this.tokenArray[from];

      if ('"' === currToken) {
        for (let i = from + 1; i <= to; i++) {
          if ('"' === this.tokenArray[i]) {
            return i;
          }
        }
      } else if ("'" === currToken) {
        for (let i = from + 1; i <= to; i++) {
          if ("'" === this.tokenArray[i]) {
            return i;
          }
        }
      } else if ('(' === currToken || '[' === currToken || '/' === currToken) {
        let isQuoteClosed = true;
        let isAposClosed = true;
        let brackets = '(' === currToken ? 1 : 0;
        let angleBrackets = '[' === currToken ? 1 : 0;
        let slashes = '/' === currToken ? 1 : 0;

        for (let i = from + 1; i <= to; i++) {
          if ('"' === this.tokenArray[i]) {
            isQuoteClosed = !isQuoteClosed;
          } else if ("'" === this.tokenArray[i]) {
            isAposClosed = !isAposClosed;
          } else if (
            '(' === this.tokenArray[i] &&
            isQuoteClosed &&
            isAposClosed
          ) {
            brackets++;
          } else if (
            ')' === this.tokenArray[i] &&
            isQuoteClosed &&
            isAposClosed
          ) {
            brackets--;
          } else if (
            '[' === this.tokenArray[i] &&
            isQuoteClosed &&
            isAposClosed
          ) {
            angleBrackets++;
          } else if (
            ']' === this.tokenArray[i] &&
            isQuoteClosed &&
            isAposClosed
          ) {
            angleBrackets--;
          } else if (
            '/' === this.tokenArray[i] &&
            isQuoteClosed &&
            isAposClosed &&
            brackets === 0 &&
            angleBrackets === 0
          ) {
            slashes--;
          }

          if (
            isQuoteClosed &&
            isAposClosed &&
            brackets === 0 &&
            angleBrackets === 0 &&
            slashes === 0
          ) {
            return i;
          }
        }
      }
    }

    return -1;
  }

  /**
   * For the given source collection and specified name, returns collection of subnodes
   * or attribute values.
   * @param source
   * @param from
   * @param to
   * @param isRecursive
   * @return Colection of TagNode instances or collection of String instances.
   * @throws {XPatherException}
   */
  private getElementsByName(
    source: XPatherResult<T>[],
    from: number,
    to: number,
    isRecursive: boolean,
    isFilterContext: boolean
  ): XPatherResult<T>[] {
    let name = this.tokenArray[from].trim();

    if (isAtt(name)) {
      name = name.slice(1);
      const result: XPatherResult<T>[] = [];
      let nodes;
      if (isRecursive) {
        nodes = new Set<T>();
        for (const next of source) {
          if (isElement(next)) {
            addAll(nodes, getAllElementsList(next, true));
          }
        }
      } else {
        nodes = source;
      }

      for (const next of Array.from(nodes)) {
        if (isElement(next)) {
          if ('*' === name) {
            result.push(
              ...this.evaluateAgainst(
                Object.values(getAttributes(next)),
                from + 1,
                to,
                false,
                1,
                1,
                isFilterContext
              )
            );
          } else {
            const attValue = getAttributeByName(next, name);
            if (attValue !== null) {
              result.push(
                ...this.evaluateAgainst(
                  [attValue],
                  from + 1,
                  to,
                  false,
                  1,
                  1,
                  isFilterContext
                )
              );
            }
          }
        } else {
          throwStandardException();
        }
      }
      return result;
    } else {
      const resultSet = new Set<XPatherResult<T>>();
      let index = 0;
      for (const next of source) {
        if (isElement(next)) {
          const node = next;
          index++;
          const isSelf = '.' === name;
          const isParent = '..' === name;
          const isAll = '*' === name;

          let subnodes: T[] = [];
          if (isSelf) {
            subnodes = [node];
          } else if (isParent) {
            const parent = getParent(node);
            subnodes = parent !== null ? [parent] : [];
          } else {
            subnodes = isAll
              ? getChildTagList(node)
              : getElementListByName(node, name, false);
          }

          const nodeSet = new Set(subnodes);
          const refinedSubnodes = this.evaluateAgainst(
            Array.from(nodeSet),
            from + 1,
            to,
            false,
            index,
            nodeSet.size,
            isFilterContext
          );

          if (isRecursive) {
            const childTags = getChildTagList(node);
            if (isSelf || isParent || isAll) {
              addAll(resultSet, refinedSubnodes);
            }
            for (const childTag of childTags) {
              const childrenByName = this.getElementsByName(
                [childTag],
                from,
                to,
                isRecursive,
                isFilterContext
              );
              if (
                !isSelf &&
                !isParent &&
                !isAll &&
                refinedSubnodes.includes(childTag)
              ) {
                resultSet.add(childTag);
              }
              addAll(resultSet, childrenByName);
            }
          } else {
            addAll(resultSet, refinedSubnodes);
          }
        } else {
          throwStandardException();
        }
      }
      return Array.from(resultSet);
    }
  }
}

// ----------------------------------------------------------------------------
// XPather methods that don't need to be in the class itself
// ----------------------------------------------------------------------------

/**
 * Evaluates logic operation on two collections.
 * @param first
 * @param second
 * @param logicOperator
 * @return Result of logic operation
 */
function evaluateLogic<T extends XPatherElement>(
  first: XPatherResult<T>[] | undefined,
  second: XPatherResult<T>[],
  logicOperator: string
): boolean {
  if (!first || first.length === 0 || !second || second.length === 0) {
    return false;
  }

  const elem1 = first[0];
  const elem2 = second[0];

  if (typeof elem1 === 'number' && typeof elem2 === 'number') {
    switch (logicOperator) {
      case '=':
        return elem1 === elem2;
      case '<':
        return elem1 < elem2;
      case '>':
        return elem1 > elem2;
      case '<=':
        return elem1 <= elem2;
      case '>=':
        return elem1 >= elem2;
    }
  } else {
    const s1 = toText(elem1);
    const s2 = toText(elem2);
    const result = s1.localeCompare(s2);
    switch (logicOperator) {
      case '=':
        return result === 0;
      case '<':
        return result < 0;
      case '>':
        return result > 0;
      case '<=':
        return result <= 0;
      case '>=':
        return result >= 0;
    }
  }

  return false;
}

/**
 * Checks if token is attribute (starts with @)
 */
function isAtt(token: string): boolean {
  return token.length > 1 && token.startsWith('@');
}

/**
 * Checks if given string is valid identifier.
 * @param s
 */
function isIdentifier(s: string): boolean {
  s = s.trim();
  if (s.length > 0) {
    if (!/^[a-z][\w-]*$/i.test(s)) {
      return false;
    }
  }
  return false;
}

const C0 = '0';
const C9 = '9';
const CD = '.';
const CP = '+';
const CM = '-';
const CS = ' ';

function isValidDouble(value: string): boolean {
  const l = value.length;
  if (l > 0) {
    let i = 1,
      c = value.charAt(0);
    if (c === CP || c === CM || c === CS || (c >= C0 && c <= C9)) {
      for (; i < l; i++) {
        c = value.charAt(i);
        if (c !== CD && (c < C0 || c > C9)) return false;
      }
      return true;
    }
  }
  return false;
}

function isValidInteger(value: string): boolean {
  const l = value.length;
  if (l > 0) {
    let i = 1;
    let c = value.charAt(0);
    if (c === CP || c === CM || (c >= C0 && c <= C9)) {
      for (; i < l; i++) {
        c = value.charAt(i);
        if (c < C0 || c > C9) return false;
      }
      return true;
    }
  }
  return false;
}

/**
 * @throws {XPatherException}
 */
function throwStandardException(): never {
  throw new XPatherException();
}

function toText<T extends XPatherElement>(o: XPatherResult<T>): string {
  return isElement(o) ? o.textContent || '' : String(o);
}

// ----------------------------------------------------------------------------
// Utility functions that were not in the original Java code, but added to make
// maintenance easier
// ----------------------------------------------------------------------------

/**
 * Adds all items in `items` to `target`.
 * @param target
 * @param source
 */
function addAll<T>(target: Set<T>, source: T[]): void {
  for (const value of source) {
    target.add(value);
  }
}

/**
 * Checks if the given XPathResultItem is an XPathElement.
 * @param value
 */
export function isElement<T extends XPatherElement>(
  value: XPatherResult<T>
): value is T {
  return Boolean(value) && typeof value === 'object';
}

/**
 * Checks if the given XPathNode is an XPathElement.
 * @param node
 */
function isElementNode<T extends XPatherElement>(node: XPatherNode): node is T {
  return node.nodeType === node.ELEMENT_NODE;
}
