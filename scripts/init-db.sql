-- 创建数据库
CREATE DATABASE IF NOT EXISTS express_api 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE express_api;

-- 用户表（TypeORM 会自动创建，这里仅供参考）
-- CREATE TABLE IF NOT EXISTS users (
--   id INT AUTO_INCREMENT PRIMARY KEY,
--   email VARCHAR(255) UNIQUE NOT NULL,
--   name VARCHAR(255) NOT NULL,
--   age INT,
--   isActive BOOLEAN DEFAULT TRUE,
--   createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
--   updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   INDEX idx_email (email),
--   INDEX idx_isActive (isActive)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入测试数据
-- INSERT INTO users (email, name, age) VALUES
--   ('john.doe@example.com', 'John Doe', 30),
--   ('jane.smith@example.com', 'Jane Smith', 25),
--   ('bob.johnson@example.com', 'Bob Johnson', 35);

