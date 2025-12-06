const express = require('express');
const app = express();
// 환경변수에서 온 PORT 값을 받습니다
const port = process.env.PORT;

app.get('/', (req, res, next) => {
  res.send('Hello, Heroku!');
});

app.listen(port, () => {
  console.log(`Server is listening on ${port}`);
});