import { Application, Router } from 'express';
import catalogRouter from './catalog/router';
import ordersRouter from './orders/router';
import paymentsRouter from './payments/router';
import ticketsRouter from './tickets/router';
import operatorsRouter from './operators/router';
// reports module removed - redemptions endpoint moved to venue module
// refunds module removed - refund functionality moved to payments module
import policiesRouter from './policies/router';
import profileRouter from './profile/router';
import usersRouter from './users/router';
import wechatAuthRouter from './auth/wechat.router';
import adminRouter from './admin/router';
import travelRouter from './travel/router';
import reservationsRouter from './reservations/router';
import otaRouter from './ota/router';
import venueRouter from './venue/router';
import qrGenerationRouter from './qr-generation/router';
import ticketReservationRouter from './ticket-reservation/router';
import reservationSlotsRouter from './reservation-slots/router';
import customerReservationRouter from './customerReservation/router';
import pricingRouter from './pricing/router';
import miniprogramRouter from './miniprogram/router';

export const registerModuleRouters = (app: Application): void => {
  app.use('/users', usersRouter);
  app.use('/auth', wechatAuthRouter); 

  app.use('/miniprogram', miniprogramRouter); // WeChat Mini Program endpoints
  app.use('/catalog', catalogRouter);
  app.use('/travel', travelRouter);
  app.use('/reservations', reservationsRouter);
  app.use('/admin', adminRouter);
  app.use('/orders', ordersRouter);
  app.use('/payments', paymentsRouter);
  app.use('/my', ticketsRouter);
  app.use('/tickets', ticketsRouter);
  app.use('/operators', operatorsRouter);
  app.use('/validators', operatorsRouter);
  app.use('/api/ota', otaRouter);
  app.use('/venue', venueRouter);
  app.use('/qr', qrGenerationRouter); // Unified QR generation and verification
  app.use('/pricing', pricingRouter);

  // Ticket reservation & validation system (PRD-006/PRD-007) - MUST BE BEFORE catch-all routers!
  // Week 3: Operator validation endpoints integrated into /operators router (see operators/router.ts)
  // NOTE: Old ticket-reservation router commented out - replaced by customerReservation with Directus support
  // app.use('/', ticketReservationRouter);
  app.use('/api', reservationSlotsRouter); // Operator slot management + customer availability
  app.use('/api', customerReservationRouter); // Enhanced customer reservation with activation checks + Directus

  // These have catch-all routes, so register them LAST
  app.use('/', policiesRouter);

  app.use('/profile', profileRouter);
};
