import { OTATicketBatchEntity } from './ota-ticket-batch.entity';

/**
 * DTO for batch with computed statistics
 * Use this when you need stats populated from tickets table
 */
export class OTATicketBatchWithStatsDTO extends OTATicketBatchEntity {
  tickets_generated?: number;
  tickets_activated?: number;
  tickets_redeemed?: number;
  total_revenue_realized?: number;

  // Statistics methods (require stats to be loaded via Repository)
  getConversionRate(): number {
    const generated = this.tickets_generated ?? 0;
    const activated = this.tickets_activated ?? 0;
    return generated > 0 ? activated / generated : 0;
  }

  getRemainingTickets(): number {
    const generated = this.tickets_generated ?? 0;
    const activated = this.tickets_activated ?? 0;
    return generated - activated;
  }

  getRedemptionRate(): number {
    const activated = this.tickets_activated ?? 0;
    const redeemed = this.tickets_redeemed ?? 0;
    return activated > 0 ? redeemed / activated : 0;
  }

  getOverallUtilization(): number {
    const generated = this.tickets_generated ?? 0;
    const redeemed = this.tickets_redeemed ?? 0;
    return generated > 0 ? redeemed / generated : 0;
  }

  getPotentialRevenue(): number {
    const generated = this.tickets_generated ?? 0;
    return generated * this.pricing_snapshot.base_price;
  }

  getRealizedRevenue(): number {
    return this.total_revenue_realized ?? 0;
  }

  getRevenueRealizationRate(): number {
    const potential = this.getPotentialRevenue();
    const realized = this.total_revenue_realized ?? 0;
    return potential > 0 ? realized / potential : 0;
  }

  // Get billing summary for this batch (requires stats to be loaded)
  getBillingSummary() {
    return {
      batch_id: this.batch_id,
      reseller_name: this.reseller_metadata?.intended_reseller || 'Direct Sale',
      campaign_type: this.batch_metadata?.campaign_type || 'standard',
      campaign_name: this.batch_metadata?.campaign_name || 'Standard Batch',
      generated_at: this.created_at,
      tickets_generated: this.tickets_generated ?? 0,
      tickets_activated: this.tickets_activated ?? 0,
      tickets_redeemed: this.tickets_redeemed ?? 0,
      conversion_rates: {
        activation_rate: this.getConversionRate(),
        redemption_rate: this.getRedemptionRate(),
        overall_utilization: this.getOverallUtilization()
      },
      revenue_metrics: {
        potential_revenue: this.getPotentialRevenue(),
        realized_revenue: this.getRealizedRevenue(),
        realization_rate: this.getRevenueRealizationRate()
      },
      wholesale_rate: this.pricing_snapshot.base_price,
      amount_due: this.total_revenue_realized ?? 0
    };
  }
}
