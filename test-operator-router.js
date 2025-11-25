const express = require('express');
const operatorRouter = require('./dist/modules/operatorValidation/router').default;

const app = express();
app.use(express.json());

console.log('Router:', typeof operatorRouter);
console.log('Routes in router:', operatorRouter.stack ? operatorRouter.stack.length : 0);

// Try both registration methods
app.use('/', operatorRouter);

app.listen(9000, () => {
  console.log('Test server running on port 9000');
  console.log('Try: curl -X POST http://localhost:9000/api/operator/login');
});
