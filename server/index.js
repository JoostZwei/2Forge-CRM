const path = require('path');
const app  = require('./app');

// Serve React build (production / LAN)
const clientDist = path.join(__dirname, '../client/dist');
app.use(require('express').static(clientDist));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, '0.0.0.0', () => console.log(`2Forge CRM: http://0.0.0.0:${PORT}`));
