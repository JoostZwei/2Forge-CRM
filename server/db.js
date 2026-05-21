const Datastore = require('@seald-io/nedb');
const path = require('path');

// On Fly.io DATA_DIR=/data (persistent volume); locally falls back to server/data/
const dir = process.env.DATA_DIR || path.join(__dirname, 'data');
require('fs').mkdirSync(dir, { recursive: true });

const ds = (name) => new Datastore({ filename: path.join(dir, `${name}.db`), autoload: true });

module.exports = {
  companies: ds('companies'),
  contacts: ds('contacts'),
  deals: ds('deals'),
  tasks: ds('tasks'),
  notes: ds('notes'),
};
