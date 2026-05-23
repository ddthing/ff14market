const https = require('https');

const url = 'https://raw.githubusercontent.com/Ra-Workspace/ffxiv-datamining-ko/master/csv/Item.csv';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => {
    data += chunk;
    if (data.length > 5000) {
      res.destroy(); // Stop downloading early
      const lines = data.split('\n');
      console.log('Row 0:', lines[0]);
      console.log('Row 1:', lines[1]);
      console.log('Row 2:', lines[2]);
      console.log('Row 3:', lines[3]);
      console.log('Row 4:', lines[4]);
    }
  });
}).on('error', console.error);
