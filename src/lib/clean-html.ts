import cheerio = require('cheerio');

/**
 * Cleans the given HTML so that it can be parsed by strict DOM parsers
 * (e.g. xmldom).
 * This does NOT mimic HtmlCleaner's behavior, although we hope it does.
 * @param html HTML markup
 */
export function cleanHtml(html: string): string {
  const $ = cheerio.load(html);

  // Manually wrap JS in comments to make xmldom happy.
  // Wrapping in <![CDATA[ ... ]]> does not work, because cheerio converts it
  // to comments.
  $('script').each((_, el) => {
    const $script = $(el);
    const code = $script.html();
    if (
      code &&
      /[<&]/.test(code) &&
      !code.includes('<![CDATA[') &&
      !code.includes('<!--')
    ) {
      $script.html(`/*<!--*/${code}/*-->*/`);
    }
  });

  // Manually sanitize content inside <noscript></noscript>, as cheerio will
  // ignore them by default.
  $('noscript').each((_, el) => {
    const $noscript = $(el);
    const contents = $noscript.html();
    if (contents !== null) {
      $noscript.html(contents);
    }
  });

  return $.xml();
}
