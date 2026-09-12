const fs = require('fs');
const path = require('path');

function createStore(dir) {
  const file = path.join(dir, 'jobs.json');
  function read() {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw err;
    }
  }
  function write(rows) {
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify(rows, null, 2)}\n`);
    fs.renameSync(tmp, file);
  }
  return {
    list() { return read(); },
    get(id) { return read().find((j) => j.id === id) || null; },
    save(job) {
      const rows = read();
      const i = rows.findIndex((j) => j.id === job.id);
      if (i >= 0) rows[i] = job; else rows.push(job);
      write(rows);
      return job;
    },
    activeCount() {
      return read().filter((j) => j.status === 'running' || j.status === 'starting').length;
    },
  };
}

module.exports = { createStore };
