import * as AWS from 'aws-sdk';
import * as qldb from 'amazon-qldb-driver-nodejs';
import * as lambda from 'aws-lambda';
import * as XRay from 'aws-xray-sdk';
import * as ion from 'ion-js';


interface Result {
    readonly PhysicalResourceId?: string;
    readonly Data?: JSON;
}

XRay.captureAWS(AWS);

export async function onEvent(
    event: lambda.KinesisStreamEvent, 
    context: lambda.Context,
): Promise<void> {
    console.log(`Processing request: `, event);

    try {
        for (const record of event.Records) {
          const payload: lambda.KinesisStreamRecordPayload = record.kinesis;

          // Load the message as ION record. 
          const ion_record = ion.load(Buffer.from(payload.data, 'base64'));
    
          // if not ION record, skip this record. 
          if (ion_record === null) continue;

          const ion_text = ion.dumpText(ion_record);

          console.log(
            `Kinesis Message:
              partition key: ${payload.partitionKey}
              sequence number: ${payload.sequenceNumber}
              kinesis schema version: ${payload.kinesisSchemaVersion}
              data: ${ion_text}
          `);

          console.log(ion_record!.fieldNames());
    
          // Do something
        }
    } catch (error) {
        console.log(error);
    }

};