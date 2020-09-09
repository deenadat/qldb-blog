/*

Description: 

This DB Stack creates an QLDB ledger. Please note currently CDK only supports raw CFN resource class to 
create QLDB ledger and QLDB streaming. There is no high-level abstract CDK construct class yet.  

The stack is also creating tables and populate initial data in QLDB via a CDK customer resource. 

*/

import * as cdk from '@aws-cdk/core';
import * as qldb from '@aws-cdk/aws-qldb';
import {CrForProvQldbTables} from './qldb-tables-provisioning';

interface QldbBlogStackProps extends cdk.StackProps {
    readonly qldbLedgerName: string;
    readonly tableNameList: string;
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

        new cdk.CfnOutput(this, 'QldbLedger', {
            value: this.qldbLedger.ref,
            description: 'Qldb Ledger ID',
        });
    }
}
