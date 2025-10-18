import { Router } from 'express';
import userRoutes from './userRoutes';

const router = Router();

// 注册路由模块
router.use('/users', userRoutes);

// 可以在此添加更多路由模块
// router.use('/posts', postRoutes);
// router.use('/comments', commentRoutes);

export default router;

