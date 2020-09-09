/*

Description: 

This DB Stack creates an QLDB ledger. Please note currently CDK only supports raw CFN resource class to 
create QLDB ledger and QLDB streaming. There is no high-level abstract CDK construct class yet.  

*/

import * as cdk from '@aws-cdk/core';
import * as qldb from '@aws-cdk/aws-qldb';

interface QldbBlogStackProps extends cdk.StackProps {
    readonly qldbLedgerName: string;
}

export class QldbBlogStack extends cdk.Stack {
    public readonly qldbLedger: qldb.CfnLedger;

    constructor(scope: cdk.Construct, id: string, props: QldbBlogStackProps) {
        super(scope, id, props);

        // Create QLDB Ledger
        this.qldbLedger = new qldb.CfnLedger(this, 'QldbBlogLedger', {
            deletionProtection: true,
            name: props.qldbLedgerName,
            permissionsMode: 'ALLOW_ALL',
        });

        

        new cdk.CfnOutput(this, 'QldbLedger', {
            value: this.qldbLedger.ref,
            description: 'Qldb Ledger ID',
        });
    }
}
