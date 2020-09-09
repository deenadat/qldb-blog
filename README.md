# Welcome to qldb-blog CDK TypeScript project!

This is a project of TypeScript development with CDK for setting up QLDB steaming to provide backup & restore support.

The `cdk.json` file tells the CDK Toolkit how to execute this app.

The steps to deploy this CDK app into your account are listed below. At the high level, the steps are doing the following things: 

  A. First compile the codes of the Lambda function required by the CDK Custom Resource which creating table and populating data in QLDB ledger. 
  B. Then compile the codes of the Lambda which replicates the data streamed-out by Kinesis Data Stream to the other QLDB.
  C. Then compile the CDK pack, which includes the following components: 
        i. the QLDB ledger creation supported by CDK aws-qldb module OOTB 
        ii. the CDK custom resource which creating tables & populating data in ledger. 
        iii. Kinesis Data Stream instance. 
        iv. The QLDB ledger streaming. 
        v. The Lambda replicating streamed-out QLDB data. 
        vi. The Kinesis Firehose which forwarding data into S3 bucket. 
        vii. The S3 buckets.
  D. Lastly cdk deploy all components into your target AWS account.

## Steps

 * `$ npm lib/handler`
 * `$ npm install`
 * `$ npm run publish`
 * `$ cd ../..` 
 * `$ npm install`   
 * `$ npm run install` 
 * `$ cdk deploy QldbBlogStack`


## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template