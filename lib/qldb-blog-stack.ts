/*

Description:

This CDK Stack creates an QLDB ledger. Please note currently CDK only supports raw CFN resource class to
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
import * as lambda from '@aws-cdk/aws-lambda';
import { KinesisEventSource } from '@aws-cdk/aws-lambda-event-sources';
import * as path from 'path';

interface QldbBlogStackProps extends cdk.StackProps {
    readonly qldbLedgerName: string;
    readonly tableNameList: string;
    readonly kdsKmsAlias: string;
    readonly s3KmsAlias: string;
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
        new CrForProvQldbTables(this, customResourceId, {
            // For information, any change of the value in props fields below will trigger Update event on the Custom
            // Resource
            ledgerName: props.qldbLedgerName,
            tableNameList: props.tableNameList,
            customResourceId,
            // Add this line to make sure the Custom Resource Lambda is always triggered to synch with latest initial data.
            description: `Generated by CDK on: ${timeStampString}`,
        });

        // Now we create Kinesis Data Stream instance with KMS CMK encryption.
        //
        // Kinesis can only guarantee sequence at the Shard only. So we set Shard number to 1 to ensure we can replay the data
        // into another QLDB in exactly the same sequence. 
        const shardCount = 1;  
        const kdsKmsKey = new kms.Key(this, 'KmsKeyForKds', {
            alias: props.kdsKmsAlias,
            description: 'KMS key used to encrypt Kinesis Data Stream instance used for QLDB streaming.',
            trustAccountIdentities: true
        });
        const kinesisDataStream = new kinesis.Stream(this, 'KinesisDataStreamForQldbStreaming', {
          streamName: 'qldb-blog-stream',
          shardCount,
          encryption: kinesis.StreamEncryption.KMS,
          encryptionKey: kdsKmsKey
        });

        // Now we create the IAM role to be assumed by QLDB to stream data into Kinesis Data Stream instance
        // created above. So we also grant the role permissions to KDS instance & KMS key used by the KDS instance. 
        this.qldbrole = new iam.Role(this, 'KinesisQLDBrole', {
          assumedBy: new iam.ServicePrincipal('qldb.amazonaws.com'),
          description: 'Role used by QLDB to stream data into Kinesis Data Stream instance'
        });
        kinesisDataStream.grantWrite(this.qldbrole);
        kinesisDataStream.grantRead(this.qldbrole)
        kinesisDataStream.grant(this.qldbrole, 'kinesis:DescribeStream');
        
 
        // Now we set up QLDB Streaming linked with KDS instance created above via the IAM role. 
        // Sets the QLDB stream includesive start time to be at 2020-01-01 to ensure all the data in QLDB
        // will be streamed out. 
        const dateTime = new Date('2020-01-01');
        this.qldbLedgerStream = new qldb.CfnStream(this, 'QldbBlogLedgerStream', {
            streamName: "QldbBlogLedgerStream",
            ledgerName: props.qldbLedgerName,
            kinesisConfiguration: {streamArn : kinesisDataStream.streamArn, aggregationEnabled: false},
            inclusiveStartTime: dateTime.toISOString(),
            roleArn: this.qldbrole.roleArn
        });
        this.qldbLedgerStream.node.addDependency(this.qldbrole);

        // Now we create the S3 bucket. A Kinesis Firehose instance will read QLDB streaming data from KDS and
        // store them into this S3 bucket. 
        const s3KmsKey = new kms.Key(this, 'KmsKeyForS3Bucket', {
          alias: props.s3KmsAlias,
          description: 'KMS key used to encrypt S3 bucket into which the Kinesis Firehose stores QLDB streaming data.',
          trustAccountIdentities: true
        });
        const bucket = new s3.Bucket(this, 'BucketForStoringQldbStreaming', {
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: s3KmsKey
        });

        // Now we create the IAM role to be assumed by Kinesis Firehose to read data from Kinesis Data Stream instance
        // and store them into s3 bucket. 
        // So we also grant the role permissions to KDS instance & KMS key used by the KDS instance, as well as S3 bucket. 
        const firehoseRole = new iam.Role(this, 'KinesisFirehoseRole', {
          assumedBy: new iam.ServicePrincipal('firehose.amazonaws.com'),
          description: 'Role used by Kinesis Firehose to read QLDB streaming from KDS instance and store into S3 bucket.'
        });
        //kdsKmsKey.grantEncryptDecrypt(firehoseRole);
        kinesisDataStream.grantRead(firehoseRole);
        kinesisDataStream.grant(firehoseRole, 'kinesis:DescribeStream');
        bucket.grantReadWrite(firehoseRole);

        // Now we create the Kinesis Firehose instance to read QLDB streaming data from the Kinesis Data Stream instance, then
        // store them into the S3 bucket. 
        const kinesisFirehoseDeliveryStream = new kinesisfirehose.CfnDeliveryStream(this, 'QldbBlogKinesisFirehoseStream', {
            deliveryStreamName: 'QldbBlogKinesisFirehoseStream',
            deliveryStreamType: 'KinesisStreamAsSource',
            s3DestinationConfiguration: {
                'bucketArn' : bucket.bucketArn,
                'roleArn' : firehoseRole.roleArn
            },
            kinesisStreamSourceConfiguration: {
                'kinesisStreamArn' : kinesisDataStream.streamArn,
                'roleArn' : firehoseRole.roleArn
            },
        });
        kinesisFirehoseDeliveryStream.node.addDependency(firehoseRole);

        // Create Lambda receives streaming message from Kinesis Data Stream and then replay the PartiQL against another QLDB
        // instance to replicate the data. 
        const replayPartiQLLambdaFn = new lambda.Function(this, 'ReplayPartiQLLambda', {
            handler: 'index.onEvent',
            runtime: lambda.Runtime.NODEJS_12_X,
            code: lambda.Code.fromAsset(path.join(__dirname, './lambda/replayQldbPartiQL/output')),
            timeout: cdk.Duration.minutes(5),
            tracing: lambda.Tracing.ACTIVE
        });

        replayPartiQLLambdaFn.addEventSource(new KinesisEventSource(kinesisDataStream, {
            batchSize: 100, // default
            startingPosition: lambda.StartingPosition.TRIM_HORIZON
        }));

        // Create CloudFormation output. 
        new cdk.CfnOutput(this, 'QldbLedger', {
            value: this.qldbLedger.ref,
            description: 'Qldb Ledger ID',
        });

    }
}
