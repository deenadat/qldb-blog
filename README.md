# Welcome to qldb-blog CDK TypeScript project!

This is a project of TypeScript development with CDK for setting up QLDB steaming to keep source and backup QLDB ledges in sync in terms of data contents and history, to mitigate the current QLDB limit of not supporting the typical DB backup & restore.

## Architecture Layout
At the high level, this CDK App has two stacks - QldbBlogDbStack & QldbBlogStreamStack. 

QldbBlogDbStack creates two QLDB ledgers, source and backup ledgers, i.e. QldbBlog & QldbBlogBackup.

QldbBlogStreamStack creates the following components:
1. A Kinesis Data Stream instance with KMS CMK encryption. Please in order to guarantee sequence, we have to set its Shard number to 1. 
2. A QLDB Stream instance which feeds all journal changes of QldbBlog ledger to the Kinesis Data Stream above. The QLDB Stream's inclusiveStartTime is set to "2020-01-01" in order to make sure all data will be replicated to backup QLDB ledger from the very beginning.
3. A Kinesis Firehose connected to the Kinesis Data Stream which store all QLDB journal change records to a S3 bucket.
4. A Lambda which has the Kinesis Data Stream as trigger. This Lambda extracts PartiQL statements from the events received from the KDS and execute those PartiQL statements against backup QDLB ledger in real time, so keep source and backup ledgers in sync in near real-time in terms of data contents.

## Deployment Steps

At the high level, to deploy the CDK app, we need to conduct the following steps: 

1. First compile the codes of the Lambda function required by the CDK Custom Resource which is used to create tables in source QLDB ledger. 
2. Then compile the codes of the Lambda function which extracts PartiQL statements from KDS events and execute them against backup ledger.
3. Then compile the CDK codes.
4. Then deploy the CDK stack of QldbBlogDbStack.
5. Lastly deploy the CDK stack of QldbBlogStreamStack. 


The detailed commands of the steps are listed below: 

 * `$ cd lib/lambda/createQldbTables`
 * `$ npm install`
 * `$ npm run publish`
 * `$ cd ../replayQldbPartiQL`
 * `$ npm install`
 * `$ npm run publish`
 * `$ cd ../../..` 
 * `$ npm install`   
 * `$ npm run build` 
 * `$ cdk deploy QldbBlogDbStack`
 * `$ cdk deploy QldbBlogStreamStack`

## Expected Results

After the CDK deployment by the steps described above, you will find that the CDK customer resource has created four tables automatically in the source ledger QldbBlog. And the backup ledger QldbBlogBackup also has the same four tables which are replicated by the PartiQL replay lambda created during CDK deployment. 

Beyond this point, if you follow the steps described in "Manual Option" section of QLDB Get Started - https://docs.aws.amazon.com/qldb/latest/developerguide/getting-started-step-2.html to create indexes & populate data into those tables of source ledger, you will find the same has been exactly replicated to backup ledger by the PartiQL statement replay Lambda automatically.

Please note there is a limitation of this solution to keep data in sync between source & backup ledgers - when correlating data rows between different tables, e.g. foreign keys, we have to use the fields visible in the QLDB User View and cannot use the document id in QLDB Committed View which is generated by QLDB automatically. The reason is the document ID value in the PartiQL statement for source ledger does not point to a valid data row in backup ledger. 

In addition, the journal change events received from QLDB stream are also stored in S3 bucket by Kinesis Firehose instance. 

## Other Useful CDK commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
