import { Application } from 'express';
import catalogRouter from './catalog/router';
import ordersRouter from './orders/router';
import paymentsRouter from './payments/router';
import ticketsRouter from './tickets/router';
import operatorsRouter from './operators/router';
import reportsRouter from './reports/router';
import refundsRouter from './refunds/router';
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
import pricingRouter from './pricing/router';
import miniprogramRouter from './miniprogram/router';

export const registerModuleRouters = (app: Application): void => {
  app.use('/users', usersRouter);
  app.use('/auth', wechatAuthRouter); // WeChat authentication endpoints
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
  app.use('/reports', reportsRouter);
  app.use('/api/ota', otaRouter);
  app.use('/venue', venueRouter);
  app.use('/qr', qrGenerationRouter); // Unified QR generation and verification
  app.use('/pricing', pricingRouter);

  app.use('/payments', refundsRouter);
  app.use('/', refundsRouter);
  app.use('/', policiesRouter);

  app.use('/profile', profileRouter);
};
