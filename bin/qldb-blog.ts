#!/usr/bin/env node
// import { BaseStack } from './base-stack';
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
const backupQldbLedgerName = app.node.tryGetContext('backupQldbLedgerName');
const tableNameList = app.node.tryGetContext('tableNameList');
const kdsKmsAlias = app.node.tryGetContext('kdsKmsAlias');
const s3KmsAlias = app.node.tryGetContext('s3KmsAlias');

new QldbBlogStack(app, 'QldbBlogStack', {
    env,
    qldbLedgerName,
    backupQldbLedgerName,
    tableNameList,
    kdsKmsAlias,
    s3KmsAlias
});
