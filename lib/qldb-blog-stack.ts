/*

Description:

This DB Stack creates an QLDB ledger. Please note currently CDK only supports raw CFN resource class to
create QLDB ledger and QLDB streaming. There is no high-level abstract CDK construct class yet.

The stack is also creating tables and populate initial data in QLDB via a CDK customer resource.

*/

import * as cdk from '@aws-cdk/core';
import * as qldb from '@aws-cdk/aws-qldb';
import {CrForProvQldbTables} from './qldb-tables-provisioning';
import * as kinesis from "@aws-cdk/aws-kinesis";
import * as kms from "@aws-cdk/aws-kms";
import * as kinesisfirehose from "@aws-cdk/aws-kinesisfirehose"
import * as iam from "@aws-cdk/aws-iam"
import * as s3 from "@aws-cdk/aws-s3"

interface QldbBlogStackProps extends cdk.StackProps {
    readonly qldbLedgerName: string;
    readonly tableNameList: string;
}


export class QldbBlogStack extends cdk.Stack {
    public readonly qldbLedger: qldb.CfnLedger;
    public readonly qldbrole: iam.Role;
    public readonly qldbLedgerStream: qldb.CfnStream;



    constructor(scope: cdk.Construct, id: string, props: QldbBlogStackProps) {

        super(scope, id, props);

        // const uid: string = cdk.Construct.node.uniqueId;
        // Create QLDB Ledger
        this.qldbLedger = new qldb.CfnLedger(this, 'QldbBlogLedger', {

            name: props.qldbLedgerName,
            permissionsMode: 'ALLOW_ALL',
        });


        // Create QLDB tables via CDK Custom Resource
        const timeStampString = new Date().toISOString();
        const customResourceId = 'ProvisionQldbTables';
        // As a reference information, any of the value in props field changes here, will trigger Update event on the Custom
        // Resource

        new CrForProvQldbTables(this, customResourceId, {
            ledgerName: props.qldbLedgerName,
            tableNameList: props.tableNameList,
            customResourceId,
            // Add this line to make sure the Custom Resource Lambda is always triggered to synch with latest initial data.
            description: `Generated by CDK on: ${timeStampString}`, // Add this line to make sure the Custom Resource Lambda
        });

        const key = new kms.Key(this, "qldbKey");

        const qldbstream = new kinesis.Stream(this, "qldbblogstream", {
          streamName: "qldb-blog-stream",
          shardCount: 3,
          encryption: kinesis.StreamEncryption.KMS,
          encryptionKey: key
        });


        let dateTime = new Date()
        const qldbstreamArn = cdk.Fn.getAtt(qldbstream.node.uniqueId, "Arn").toString();
        // const qldbstreamArn = cdk.Fn.getAtt(this.qldbstream.uniqueId, "Arn").toString();
        // const value =

        this.qldbrole = new iam.Role(this, 'KinesisQLDBrole', {
          assumedBy: new iam.ServicePrincipal('qldb.amazonaws.com'),
        });

        const iamPolicyStatement = new iam.PolicyStatement({
          resources: ['*'],
          actions: ['kinesis:PutRecord*', 'kinesis:DescribeStream', 'kinesis:ListShards','kms:GenerateDataKey'],
        })
        this.qldbrole.addToPolicy(iamPolicyStatement);
        const qldbroleArn = cdk.Fn.getAtt(this.qldbrole.node.uniqueId, "Arn").toString();
        // const qldbroleArn = cdk.Fn.getAtt(this.qldbrole.uniqueId, "Arn").toString();

        this.qldbLedgerStream = new qldb.CfnStream(this, 'QldbBlogLedgerStream', {
            streamName: "QldbBlogLedgerStream",
            ledgerName: props.qldbLedgerName,
            kinesisConfiguration: {streamArn : qldbstream.streamArn, aggregationEnabled: true},
            inclusiveStartTime: dateTime.toISOString(),
            roleArn:this.qldbrole.roleArn
        });
        this.qldbLedgerStream.node.addDependency(this.qldbrole);
        const bucket = new s3.Bucket(this, 'MyUnencryptedBucket', {
            encryption: s3.BucketEncryption.KMS
        });

        const firehouseRole = new iam.Role(this, 'firehouseRole', {
          assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
        });

        const iamfirePolicyStatement = new iam.PolicyStatement({
          resources: ['*'],
          actions: ["kinesis:PutRecord*", "kinesis:DescribeStream",
          "kinesis:ListShards",
          "kms:GenerateDataKey",
          "kinesis:GetRecords",
          "kinesis:GetShardIterator", "s3:AbortMultipartUpload",
                "s3:GetBucketLocation",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:ListBucketMultipartUploads",
                "s3:PutObject"],
        })
        firehouseRole.addToPolicy(iamfirePolicyStatement);

        const qldbkinesisStream = new kinesisfirehose.CfnDeliveryStream(this, "QldbBlogKinesisFirehouseStream", {

          deliveryStreamName: "QldbBlogKinesisFirehouseStream",
          deliveryStreamType: "KinesisStreamAsSource",
          s3DestinationConfiguration: {
            "bucketArn" : bucket.bucketArn,
            "roleArn" : firehouseRole.roleArn
          },
          kinesisStreamSourceConfiguration: {"kinesisStreamArn" : qldbstream.streamArn,"roleArn" : firehouseRole.roleArn}

        });
        qldbkinesisStream.node.addDependency(firehouseRole);
        new cdk.CfnOutput(this, 'QldbLedger', {
            value: this.qldbLedger.ref,
            description: 'Qldb Ledger ID',
        });
    }
}
