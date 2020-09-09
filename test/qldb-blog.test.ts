import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as QldbBlog from '../lib/qldb-blog-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new QldbBlog.QldbBlogStack(app, 'MyTestStack', {
      qldbLedgerName: "QldbBlog"
    });
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
