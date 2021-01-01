/**
 * @file Tests for the TypeScript port of XPather from HtmlCleaner.
 *
 * This code is based on the original unit test for XPather.java, available at:
 */

import {readFileSync} from 'fs';

import {xpath} from '../../src/kolmafia/xpath';

/**
 * The following test cases are based on the unit tests for XPather.java,
 * available at:
 *    https://sourceforge.net/p/htmlcleaner/code/HEAD/tree/tags/htmlcleaner-2.24/src/test/java/org/htmlcleaner/XPatherTest.java
 *
 * They are under the following license:
 * -----------------------------------------------------------------------------
 * Copyright (c) 2006-2019, the HTMLCleaner project
 * All rights reserved.
 *
 * Redistribution and use of this software in source and binary forms,
 * with or without modification, are permitted provided that the following
 * conditions are met:
 *
 * * Redistributions of source code must retain the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above
 *   copyright notice, this list of conditions and the
 *   following disclaimer in the documentation and/or other
 *   materials provided with the distribution.
 *
 * * The name of HtmlCleaner may not be used to endorse or promote
 *   products derived from this software without specific prior
 *   written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * Report any issues and contact the developers through Sourceforge at
 * https://sourceforge.net/projects/htmlcleaner/
 */

describe('xpath()', () => {
  let TEST_HTML: string;

  beforeAll(() => {
    // Use file path relative to project root, so that the test data can be
    // loaded from the compiled JS code
    TEST_HTML = readFileSync('spec/kolmafia/xpath.spec.html', 'utf8');
  });

  describe('expressions', () => {
    it('should handle basic recursion', () => {
      expect(xpath(TEST_HTML, '//div//a').length).toEqual(160);
    });

    it('should handle attribute existence checks', () => {
      expect(xpath(TEST_HTML, '//div//a[@id][@class]')).toEqual([
        '<a href="r/xc" id="t1" class="on" title="Ocean">Ocean</a>',
        '<a href="r/xy" id="allyservices" class="btn-more-2" title="View the complete list of Yahoo! Services">More Yahoo! Services</a>',
      ]);
    });

    it('should handle numeric indices', () => {
      expect(xpath(TEST_HTML, '/body/*[1]/@type')).toEqual(['text/javascript']);
      expect(xpath(TEST_HTML, '//div[3]//a[@id]')).toEqual([
        '<a hidefocus="true" id="inthenews2" href="r/nb">In the News</a>',
        '<a hidefocus="true" id="worldnews" href="r/1a">World</a>',
        '<a hidefocus="true" id="localnews" href="r/n4">Local</a>',
        '<a hidefocus="true" id="finsnews" href="r/fh">Finance</a>',
      ]);
    });

    it('should handle attribute comparisons', () => {
      expect(xpath(TEST_HTML, "//div[3]//a[@id][@href='r/n4']")).toEqual([
        '<a hidefocus="true" id="localnews" href="r/n4">Local</a>',
      ]);
      expect(xpath(TEST_HTML, "//div[3]//a['video'=@class]")).toEqual([
        `<a class="video" href="s/826119" onclick="return (!YAHOO.Fp ? true : showVideo({
cId: '6829014',
yAd: '1'},event));">An on-court proposal</a>`,
        '<a class="video" href="s/826121" onclick="window.open(\'s/826121\',\'playerWindow\',\'width=793,height=666,scrollbars=no\');return false;">See a one-armed basketball champ </a>',
        '<a class="video" style="background-position:-3px -48px;font:normal 100% arial;" href="s/826250" onclick="window.open(\'s/826250\',\'playerWindow\',\'width=793,height=666,scrollbars=no\');return false;">Israeli police raid the home of gunman behind school shooting</a>',
        '<a class="video" style="background-position:-3px -48px;font:normal 100% arial;" href="s/826254" onclick="window.open(\'s/826254\',\'playerWindow\',\'width=793,height=666,scrollbars=no\');return false;">Clinton continues to question Obama\'s experience</a>',
        '<a class="video" style="background-position:-3px -48px;font:normal 100% arial;" href="s/826259" onclick="window.open(\'s/826259\',\'playerWindow\',\'width=793,height=666,scrollbars=no\');return false;">Zero emission sports car unveiled at Switzerland auto show</a>',
      ]);
    });

    it('should handle the parent selector', () => {
      expect(xpath(TEST_HTML, '//div[3]//a[@style]/..//li[a]')).toEqual([
        '<li><a href="r/xn">News</a></li>',
        '<li><a href="r/me">Popular</a></li>',
        '<li class="last"><a href="r/z0">Election \'08</a></li>',
      ]);
    });

    it('should handle grouping parentheses', () => {
      expect(xpath(TEST_HTML, '(//body//div[3][@class]/span)[4]/@id')).toEqual([
        'featured4ct',
      ]);
      expect(xpath(TEST_HTML, '//body//div[3][@class]//span[2]/@id')).toEqual([
        'featured2ct',
        'worldnewsct',
      ]);
    });

    it('should handle numeric comparisons', () => {
      expect(
        xpath(
          TEST_HTML,
          '(//div[last() >= 4]//./div[position() = last()])[position() > 22]//li[2]//a'
        )
      ).toEqual([
        '<a href="s/825741/*-http://food.yahoo.com/recipes/allrecipes/26358/awesome-chicken-noodle-soup">Awesome Chicken Noodle...</a>',
        '<a href="r/dy/*-http://search.yahoo.com/search?p=Celebrity+Rehab&amp;cs=bz&amp;fr=fp-buzzmod">Celebrity Rehab</a>',
        '<a href="r/dy/*-http://search.yahoo.com/search?p=24&amp;cs=bz&amp;fr=fp-buzzmod">24</a>',
      ]);
    });

    it('should handle the asterisk selector', () => {
      expect(xpath(TEST_HTML, '//*[@class][@id]//*[@style]').length).toEqual(
        23
      );
    });

    it('should distinguish single (/) and double (//) slashes', () => {
      expect(xpath(TEST_HTML, '//div/@class').length).toEqual(43);
      expect(xpath(TEST_HTML, '//div//@class').length).toEqual(130);
    });

    it('should handle complex expressions', () => {
      expect(xpath(TEST_HTML, '(//div[@id]//@class)[position() < 5]')).toEqual([
        'eyebrowborder',
        'mastheadbd',
        'iemw',
        'ac_container',
      ]);
      expect(xpath(TEST_HTML, '//div[2]/@*').length).toEqual(33);
      expect(xpath(TEST_HTML, '//div[2]/@*[2]')).toEqual([
        'ad',
        'bd',
        'bd',
        'papreviewdiv',
        'ad',
        'bd',
        'bd',
      ]);
      expect(xpath(TEST_HTML, '//div[2]//a[. = "Images"]/@href')).toEqual([
        'r/00/*-http://images.search.yahoo.com/search/images',
      ]);
    });

    it('should support lexicographical attribute comparisons', () => {
      expect(xpath(TEST_HTML, "//a['v' < @id]/@id")).toEqual([
        'vsearchmore',
        'worldnews',
      ]);
      expect(xpath(TEST_HTML, "data(//a['v' < @id])")).toEqual([
        '<a id="vsearchmore" href="r/bv">More</a>',
        '<a hidefocus="true" id="worldnews" href="r/1a">World</a>',
      ]);
    });
  });

  describe('functions', () => {
    it('should support the count() function', () => {
      expect(xpath(TEST_HTML, 'count(//div//img)')).toEqual(['26']);
      expect(xpath(TEST_HTML, 'count(//a)')).toEqual(['160']);
    });

    it('should support the data() function', () => {
      expect(xpath(TEST_HTML, 'data(//div//a[@id][@class])')).toEqual([
        '<a href="r/xc" id="t1" class="on" title="Ocean">Ocean</a>',
        '<a href="r/xy" id="allyservices" class="btn-more-2" title="View the complete list of Yahoo! Services">More Yahoo! Services</a>',
      ]);
    });

    it('should support the last() function', () => {
      expect(xpath(TEST_HTML, '//p/last()')).toEqual(['2', '2']);
      expect(
        xpath(TEST_HTML, '//body//div[3][@class]//span[last()<=4]/@id')
      ).toEqual(['inthenews2ct', 'worldnewsct', 'localnewsct', 'finsnewsct']);
    });

    it('should support the position() function', () => {
      expect(xpath(TEST_HTML, '//style/position()')).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
      ]);
      expect(xpath(TEST_HTML, '//div//../span[position() = 2]/@id')).toEqual([
        'featured2ct',
        'footer2',
        'worldnewsct',
      ]);
      expect(
        xpath(TEST_HTML, 'data(//div[last() >= 4][position() <= 2]//li[4]//a)')
      ).toEqual([
        '<a hidefocus="true" id="money1" href="r/1i">Video</a>',
        '<a href="s/826104"><img src="http://us.i1.yimg.com/us.yimg.com/i/ww/news/2008/03/06/great_weekend_sm.jpg" alt="" width="29" height="21"/>7 top cities for a great weekend trip</a>',
        '<a href="http://us.ard.yahoo.com/SIG=152e57d6h/M=635447.12253918.12661335.8383570/D=yahoo_top/S=2716149:FPAD/_ylt=AilDjxDmkLuULU.USpsXNbr1cSkA;_ylg=X3oDMTBkOHMxazdlBGNjA3JzBGZwdWxtAzA-/Y=YAHOO/EXP=1204886720/L=3dZaylf4cQ7_gl4GRvfdKwWNTWkaeEfRAKAAAGWo/B=s7KKPNibyQk-/J=1204879520085487/A=4868014/R=8/SIG=11i1n9md4/*http://autos.yahoo.com/chrysler/?category=Sedans">Chrysler</a>',
        '<a href="http://us.ard.yahoo.com/SIG=152e57d6h/M=635447.12253918.12661335.8383570/D=yahoo_top/S=2716149:FPAD/_ylt=AilDjxDmkLuULU.USpsXNbr1cSkA;_ylg=X3oDMTBkOHMxazdlBGNjA3JzBGZwdWxtAzA-/Y=YAHOO/EXP=1204886720/L=3dZaylf4cQ7_gl4GRvfdKwWNTWkaeEfRAKAAAGWo/B=s7KKPNibyQk-/J=1204879520085487/A=4868014/R=12/SIG=13o390944/*http://autos.yahoo.com/jeep/;_ylc=X3oDMTFnNTFsczd0BF9TAzI3MTYxNDkEc2VjA2ZwLXBhaWQtYWQtcGxhY2VtZW50BHNsawNjdHItamVlcA--">Jeep</a>',
        '<a href="http://us.ard.yahoo.com/SIG=152e57d6h/M=635447.12253918.12661335.8383570/D=yahoo_top/S=2716149:FPAD/_ylt=AilDjxDmkLuULU.USpsXNbr1cSkA;_ylg=X3oDMTBkOHMxazdlBGNjA3JzBGZwdWxtAzA-/Y=YAHOO/EXP=1204886720/L=3dZaylf4cQ7_gl4GRvfdKwWNTWkaeEfRAKAAAGWo/B=s7KKPNibyQk-/J=1204879520085487/A=4868014/R=16/SIG=14ge0sj5e/*http://autos.yahoo.com/saturn/;_ylc=X3oDMTFpdnFvcDY2BF9TAzI3MTYxNDkEc2VjA2ZwLXBhaWQtYWQtcGxhY2VtZW50BHNsawNjdHItc2F0dXJu?category=Convertibles">Saturn</a>',
        '<a href="http://us.ard.yahoo.com/SIG=152e57d6h/M=635447.12253918.12661335.8383570/D=yahoo_top/S=2716149:FPAD/_ylt=AilDjxDmkLuULU.USpsXNbr1cSkA;_ylg=X3oDMTBkOHMxazdlBGNjA3JzBGZwdWxtAzA-/Y=YAHOO/EXP=1204886720/L=3dZaylf4cQ7_gl4GRvfdKwWNTWkaeEfRAKAAAGWo/B=s7KKPNibyQk-/J=1204879520085487/A=4868014/R=20/SIG=14jkmfo79/*http://autos.yahoo.com/carcenter/car_insurance.html;_ylc=X3oDMTFscHZuMXR2BF9TAzI3MTYxNDkEc2VjA2ZwLXBhaWQtYWQtcGxhY2VtZW50BHNsawNjdHItaW5zdXJhbmNl">Insurance</a>',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // End of code derived from HtmlCleaner
  // ---------------------------------------------------------------------------
  describe('HtmlCleaner behavior', () => {
    it('should replicate the absolute-path predicate bug', () => {
      // Bug #223: https://sourceforge.net/p/htmlcleaner/bugs/223/
      //
      // Although //div[//span] and //div[.//span] mean different things,
      // HtmlCleaner v2.24 treats both as the same.
      const html = '<div><span>Foo</span><div>Bar</div></div>';

      // This is standards-compliant behavior
      expect(xpath(html, '//div[.//span]')).toEqual([
        '<div><span>Foo</span><div>Bar</div></div>',
      ]);
      // This is NOT standards-compliant behavior. It should be returning
      // two elements, but HtmlCleaner only returns one.
      // Since our goal is to replicate HtmlCleaner's behavior, we must
      // replicate the bug as well.
      expect(xpath(html, '//div[//span]')).toEqual([
        '<div><span>Foo</span><div>Bar</div></div>',
      ]);
    });
  });
});
