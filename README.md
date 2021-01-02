# kolmafia-stubs

kolmafia-stubs is a library for testing KoLmafia scripts in Node.js. It provides stubs for KoLmafia's library functions, which can be used to simulate KoLmafia's runtime environment.

## Installation

kolmafia-stubs supports Node.js v10 and above.

To install:

```
npm install --save-dev kolmafia-stubs
```

## Usage

kolmafia-stubs merely provides function stubs. To inject them into the current execution environment, you will need a module-mocking tool, such as [mock-require](https://github.com/boblauer/mock-require).

Suppose your script uses the `xpath()` function:

```js
// src/my-kolmafia-code.js
const {xpath} = require('kolmafia');

const result = xpath(/* Do something */);
```

To test this code in Node.js, you can inject `xpath()` function into the global scope before importing your code:

```js
// test/my-kolmafia-code.test.js
import mock from 'mock-require';
import {xpath} from 'kolmafia-stubs';

mock('kolmafia', {xpath});

import {myFunc} from './src/my-kolmafia-code';
```

## Provided functions

### xpath()

```ts
function xpath(html: string, selector: string): string[];
```

Implementation of the [`xpath()`](https://wiki.kolmafia.us/index.php/Xpath) function.

Parameters:

- `html`: HTML or XML markup. This is sanitized as a HTML document.
- `selector`: XPath selector

Returns: Array of matched nodes

Just as in KoLmafia, this function supports a limited set of XPath features offered by [`XPather`](http://htmlcleaner.sourceforge.net/doc/org/htmlcleaner/XPather.html).
