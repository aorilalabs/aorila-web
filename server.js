/** Static Aorila Labs site — listens on Render PORT */
const path = require('path');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.static(__dirname, { extensions: ['html'] }));
app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`aorila-web :${PORT}`);
});
