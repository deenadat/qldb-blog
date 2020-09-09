# Welcome to qldb-blog CDK TypeScript project!

This is a project of TypeScript development with CDK for setting up QLDB steaming to provide backup & restore support.

The `cdk.json` file tells the CDK Toolkit how to execute this app.

The steps to deploy this CDK app into your account are listed below, which first create the Lambda codes required for the 
CDK Custom Resource which creating table and populating data in QLDB ledger then compile the CDK codes and deploy into
target AWS account. 

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