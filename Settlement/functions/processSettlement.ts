import { app, InvocationContext } from '@azure/functions';
import { Settlement } from '@shared/types/settlement';

export async function processSettlements(message: unknown, context: InvocationContext): Promise<void> {
    context.log('Settlement processor function started', message);
    
    try {
        const messageBody = message as {
            type: string;
            data: Settlement | Settlement[];
            batch_id?: string;
            timestamp: string;
        };

        if (messageBody.type === 'batch_settlement') {
            const settlements = messageBody.data as Settlement[];
            context.log(`Processing batch ${messageBody.batch_id} with ${settlements.length} settlements`);
            
            // Process each settlement using your exact field names
            for (const settlement of settlements) {
                await processSettlement(settlement, context);
            }
        } else if (messageBody.type === 'single_update') {
            const settlement = messageBody.data as Settlement;
            context.log(`Processing single settlement: ${settlement.ClaimantGUID}`);
            await processSettlement(settlement, context);
        }

        context.log('Settlement processing completed successfully');
    } catch (error: any) {
        context.log.error('Settlement processing failed:', error);
        throw error;
    }
}

async function processSettlement(settlement: Settlement, context: InvocationContext): Promise<void> {
    try {
        context.log(`Processing settlement for ClaimantGUID: ${settlement.ClaimantGUID}`);
        
        // Database operations using your exact field names
        
        // Main settlement record
        // await db.query(`
        //     INSERT INTO settlements (ClaimantGUID, CaseProjectID, OtherID1, OtherID2, BaseGrossAwardAmount, EIFAwardAmount, AppealAwardAmount)
        //     VALUES (?, ?, ?, ?, ?, ?, ?)
        //     ON DUPLICATE KEY UPDATE
        //     CaseProjectID=VALUES(CaseProjectID), BaseGrossAwardAmount=VALUES(BaseGrossAwardAmount),
        //     EIFAwardAmount=VALUES(EIFAwardAmount), AppealAwardAmount=VALUES(AppealAwardAmount)
        // `, [settlement.ClaimantGUID, settlement.CaseProjectID, settlement.OtherID1, settlement.OtherID2,
        //     settlement.BaseGrossAwardAmount, settlement.EIFAwardAmount, settlement.AppealAwardAmount]);

        // Process AttorneyFees array (multiple law firms supported)
        for (const fee of settlement.AttorneyFees) {
            // await db.query(`
            //     INSERT INTO attorney_fees (ClaimantGUID, FirmName, AttorneyFeeDescription, AttorneyFeeAmount, AttorneyFeePercentage)
            //     VALUES (?, ?, ?, ?, ?)
            // `, [settlement.ClaimantGUID, fee.FirmName, fee.AttorneyFeeDescription, fee.AttorneyFeeAmount, fee.AttorneyFeePercentage]);
        }

        // Process AttorneyCosts array
        for (const cost of settlement.AttorneyCosts) {
            // await db.query(`
            //     INSERT INTO attorney_costs (ClaimantGUID, FirmName, AttorneyCostDescription, AttorneyCostAmount)
            //     VALUES (?, ?, ?, ?)
            // `, [settlement.ClaimantGUID, cost.FirmName, cost.AttorneyCostDescription, cost.AttorneyCostAmount]);
        }

        // Process VendorFees array
        for (const fee of settlement.VendorFees) {
            // await db.query(`
            //     INSERT INTO vendor_fees (ClaimantGUID, VendorName, VendorType, VendorFeeDescription, VendorFeeAmount, VendorFeePercentage)
            //     VALUES (?, ?, ?, ?, ?, ?)
            // `, [settlement.ClaimantGUID, fee.VendorName, fee.VendorType, fee.VendorFeeDescription, fee.VendorFeeAmount, fee.VendorFeePercentage]);
        }

        // Process VendorCosts array
        for (const cost of settlement.VendorCosts) {
            // await db.query(`
            //     INSERT INTO vendor_costs (ClaimantGUID, VendorName, VendorType, VendorCostDescription, VendorCostAmount)
            //     VALUES (?, ?, ?, ?, ?)
            // `, [settlement.ClaimantGUID, cost.VendorName, cost.VendorType, cost.VendorCostDescription, cost.VendorCostAmount]);
        }
        
        context.log(`Settlement processed successfully: ${settlement.ClaimantGUID}`);
    } catch (error: any) {
        context.log.error(`Failed to process settlement ${settlement.ClaimantGUID}:`, error);
        throw error;
    }
}

app.serviceBusQueue('processSettlements', {
    connection: 'SERVICE_BUS_CONNECTION_STRING',
    queueName: 'settlement_processing_fifo',
    handler: processSettlements
});