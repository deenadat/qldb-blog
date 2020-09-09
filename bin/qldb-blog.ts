#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { QldbBlogStack } from '../lib/qldb-blog-stack';

const app = new cdk.App();

// Retrieve current env & QLDB ledger name
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
};
const qldbLedgerName = app.node.tryGetContext('qldbLedgerName');
const tableNameList = app.node.tryGetContext('tableNameList');

new QldbBlogStack(app, 'QldbBlogStack', {
    env,
    qldbLedgerName,
    tableNameList
});
