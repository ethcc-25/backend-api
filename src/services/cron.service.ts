import * as cron from 'node-cron';
import { WithdrawService } from './withdraw.service';
import { RetrieveService } from './retrieve';

export class CronService {
  private withdrawService: WithdrawService;
  private retrieveService: RetrieveService;
  private isProcessing: boolean = false;

  constructor() {
    this.withdrawService = new WithdrawService();
    this.retrieveService = new RetrieveService();
  }

  /**
   * Start all cron jobs
   */
  start(): void {
    console.log('🕐 Starting cron jobs...');
    
    // Check pending attestations every 2 minutes
    cron.schedule('*/2 * * * *', async () => {
      await this.processPendingAttestations();
    });

    console.log('✅ Cron jobs started successfully');
  }

  /**
   * Process all pending attestation withdraws
   */
  private async processPendingAttestations(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ Attestation processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log('🔍 Checking for pending attestation withdraws...');
      
      const pendingWithdraws = await this.withdrawService.getPendingAttestationWithdraws();
      
      if (pendingWithdraws.length === 0) {
        console.log('✅ No pending attestation withdraws found');
        return;
      }

      console.log(`📋 Found ${pendingWithdraws.length} pending attestation withdraw(s)`);

      for (const withdraw of pendingWithdraws) {
        try {
          await this.processIndividualWithdraw(withdraw);
        } catch (error) {
          console.error(`❌ Error processing withdraw ${withdraw._id}:`, error);
          // Continue with other withdraws even if one fails
        }
      }

    } catch (error) {
      console.error('❌ Error in processPendingAttestations:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process an individual withdraw
   */
  private async processIndividualWithdraw(withdraw: any): Promise<void> {
    if (!withdraw.initWithdrawTxHash) {
      console.error(`❌ Withdraw ${withdraw._id} has no initWithdrawTxHash`);
      return;
    }

    console.log(`🔍 Checking attestation for withdraw ${withdraw._id}, tx: ${withdraw.initWithdrawTxHash}`);

    try {
      // Check if attestation is available
      const attestationData = await this.retrieveService.retrieveAttestation(
        withdraw.initWithdrawTxHash,
        withdraw.srcChainDomain
      );

      if (!attestationData) {
        console.log(`⏳ Attestation not ready yet for withdraw ${withdraw._id}`);
        return;
      }

      if (attestationData.status !== 'complete') {
        console.log(`⏳ Attestation status is ${attestationData.status} for withdraw ${withdraw._id}`);
        return;
      }

      console.log(`✅ Attestation ready for withdraw ${withdraw._id}, processing...`);

      // Process the withdraw with the attestation
      await this.withdrawService.processWithdrawWithAttestation(withdraw._id, attestationData);

      console.log(`🎉 Successfully processed withdraw ${withdraw._id}`);

    } catch (error) {
      console.error(`❌ Error processing withdraw ${withdraw._id}:`, error);
      
      // Update withdraw status to failed if it's a critical error
      if (error instanceof Error && error.message.includes('timeout')) {
        // Don't mark as failed for timeout errors, keep trying
        console.log(`⏳ Timeout for withdraw ${withdraw._id}, will retry later`);
      } else {
        // Mark as failed for other errors
        try {
          await this.withdrawService.updateWithdrawStatus(withdraw._id, {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error during attestation processing'
          });
          console.log(`❌ Marked withdraw ${withdraw._id} as failed`);
        } catch (updateError) {
          console.error(`❌ Failed to update withdraw status for ${withdraw._id}:`, updateError);
        }
      }
    }
  }

  /**
   * Stop all cron jobs
   */
  stop(): void {
    console.log('🛑 Stopping cron jobs...');
    cron.getTasks().forEach(task => task.stop());
    console.log('✅ Cron jobs stopped');
  }
}