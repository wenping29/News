const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');
const { startScheduler } = require('./collectors/scheduler');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// API 路由
app.use('/api', apiRoutes);

// 健康检查
app.get('/health', (req, res) => res.json({ status: 'ok' }));

async function main() {
  console.log('正在初始化数据库...');
  await initDB();
  console.log('数据库初始化完成');

  app.listen(PORT, () => {
    console.log(`后端服务已启动: http://localhost:${PORT}`);
    console.log(`API 地址: http://localhost:${PORT}/api`);
    // 启动定时采集
    startScheduler('0 */6 * * *');
  });
}

main().catch(err => {
  console.error('启动失败:', err);
  process.exit(1);
});
